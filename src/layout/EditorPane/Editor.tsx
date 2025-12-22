import React, { useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { type Monaco } from "./types";
import "./style.css";
import PythonLspWorker from "../../workers/pythonLspWorker?worker";
import {
  registerCompletionProvider,
  registerHoverProvider,
  registerSignatureHelpProvider,
} from "./providers";

interface EditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  activeLine: number | null;
  // New prop to sync changes back to parent when code edits shift lines
  onBreakpointsChange: (newBreakpoints: Set<number>) => void;
  onLSPReady: () => void;
}

const CodeEditor: React.FC<EditorProps> = ({
  value,
  onChange,
  breakpoints,
  toggleBreakpoint,
  activeLine,
  onBreakpointsChange,
  onLSPReady,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Separate refs to manage decorations independently
  const bpDecorationsRef = useRef<string[]>([]);
  const activeDecorationsRef = useRef<string[]>([]);
  const previewDecorationsRef = useRef<string[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const completionProviderRef = useRef<any>(null);
  const hoverProviderRef = useRef<any>(null);
  const signatureHelpProviderRef = useRef<any>(null);
  const breakpointsRef = useRef<Set<number>>(breakpoints);

  // Flag to prevent update loops
  const isSyncingRef = useRef(false);

  // Drag-to-range state
  const dragStartLineRef = useRef<number | null>(null);
  const dragCurrentLineRef = useRef<number | null>(null);
  const isDraggingRangeRef = useRef(false);

  // Init LSP Worker
  useEffect(() => {
    // Create worker
    const worker: Worker = new PythonLspWorker();
    worker.addEventListener("message", (event: MessageEvent) => {
      if (event.data.type === "ready") {
        onLSPReady();
      }
    });
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Completion Provider
    if (!completionProviderRef.current) {
      completionProviderRef.current = registerCompletionProvider(
        monaco,
        workerRef,
      );
    }

    // Register Hover Provider
    if (!hoverProviderRef.current) {
      hoverProviderRef.current = registerHoverProvider(monaco, workerRef);
    }

    // Register Signature Help Provider
    if (!signatureHelpProviderRef.current) {
      signatureHelpProviderRef.current = registerSignatureHelpProvider(
        monaco,
        workerRef,
      );
    }
    const clearPreview = () => {
      if (!editorRef.current) return;
      previewDecorationsRef.current = editorRef.current.deltaDecorations(
        previewDecorationsRef.current,
        [],
      );
    };

    const updatePreview = (startLine: number, endLine: number) => {
      if (!editorRef.current || !monacoRef.current) return;
      const editorInstance = editorRef.current;
      const monacoInstance = monacoRef.current;
      const [from, to] =
        startLine <= endLine ? [startLine, endLine] : [endLine, startLine];

      const decorations: any[] = [];
      for (let line = from; line <= to; line++) {
        decorations.push({
          range: new monacoInstance.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "breakpoint-range-line",
            glyphMarginClassName: "breakpoint-range-glyph",
          },
        });
      }

      previewDecorationsRef.current = editorInstance.deltaDecorations(
        previewDecorationsRef.current,
        decorations,
      );
    };

    // 1. Gutter mouse handlers for click or drag-to-range
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position.lineNumber;
        dragStartLineRef.current = line;
        dragCurrentLineRef.current = line;
        isDraggingRangeRef.current = false;
      }
    });

    editor.onMouseMove((e: any) => {
      if (
        dragStartLineRef.current !== null &&
        e.target.position &&
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const currentLine = e.target.position.lineNumber;
        dragCurrentLineRef.current = currentLine;
        if (currentLine !== dragStartLineRef.current) {
          isDraggingRangeRef.current = true;
        }
        updatePreview(dragStartLineRef.current, currentLine);
      }
    });

    editor.onMouseUp((e: any) => {
      if (dragStartLineRef.current === null) return;

      const releaseLine =
        e.target?.position?.lineNumber ?? dragStartLineRef.current;
      const start = dragStartLineRef.current;
      const end = releaseLine;

      if (isDraggingRangeRef.current && start !== null && end !== null) {
        const [from, to] = start <= end ? [start, end] : [end, start];
        const latest = breakpointsRef.current;
        const newSet = new Set<number>(latest);
        for (let line = from; line <= to; line++) {
          if (newSet.has(line)) {
            newSet.delete(line);
          } else {
            newSet.add(line);
          }
        }
        onBreakpointsChange(newSet);
      } else {
        // Treat as single click toggle
        toggleBreakpoint(start);
      }

      clearPreview();
      dragStartLineRef.current = null;
      dragCurrentLineRef.current = null;
      isDraggingRangeRef.current = false;
    });

    // 2. Content Change Handler (Sticky Breakpoints)
    // When text changes, Monaco moves decorations automatically.
    // We must query their new positions and update React state.
    editor.onDidChangeModelContent(() => {
      if (!monaco || !editor) return;

      const model = editor.getModel();
      if (!model) return;

      const currentIds = bpDecorationsRef.current;
      if (currentIds.length === 0) return;

      const newBreakpointSet = new Set<number>();
      let hasChanges = false;

      // Check where Monaco moved our decorations
      currentIds.forEach((id) => {
        const range = model.getDecorationRange(id);
        // If range is valid and not collapsed to zero (line deleted)
        if (range && range.startLineNumber > 0) {
          newBreakpointSet.add(range.startLineNumber);
        } else {
          // Decoration was on a deleted line
          hasChanges = true;
        }
      });

      // Compare with current props to avoid unnecessary updates
      if (newBreakpointSet.size !== breakpoints.size) {
        hasChanges = true;
      } else {
        for (const b of breakpoints) {
          if (!newBreakpointSet.has(b)) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        isSyncingRef.current = true;
        onBreakpointsChange(newBreakpointSet);
        // Reset flag after a short delay to allow React lifecycle to catch up
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      }
    });
  };

  // Sync React Breakpoints -> Monaco Decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || isSyncingRef.current)
      return;

    const editor = editorRef.current;
    const monaco: Monaco = monacoRef.current;

    const newDecorations: any[] = [];
    breakpoints.forEach((line) => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "breakpoint-glyph",
          // Stickiness makes decorations follow text edits
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    bpDecorationsRef.current = editor.deltaDecorations(
      bpDecorationsRef.current,
      newDecorations,
    );
  }, [breakpoints]);

  // Cleanup provider on unmount
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
        completionProviderRef.current = null;
      }
      if (hoverProviderRef.current) {
        hoverProviderRef.current.dispose();
        hoverProviderRef.current = null;
      }
      if (signatureHelpProviderRef.current) {
        signatureHelpProviderRef.current.dispose();
        signatureHelpProviderRef.current = null;
      }
      if (previewDecorationsRef.current.length && editorRef.current) {
        previewDecorationsRef.current = editorRef.current.deltaDecorations(
          previewDecorationsRef.current,
          [],
        );
      }
    };
  }, []);

  // Sync Active Line -> Monaco Decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations: any[] = [];
    if (activeLine !== null) {
      newDecorations.push({
        range: new monaco.Range(activeLine, 1, activeLine, 1),
        options: {
          isWholeLine: true,
          className: "monaco-active-line",
        },
      });
      editor.revealLineInCenter(activeLine);
    }

    activeDecorationsRef.current = editor.deltaDecorations(
      activeDecorationsRef.current,
      newDecorations,
    );
  }, [activeLine]);

  // Keep a ref of latest breakpoints for stable event handlers
  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          glyphMargin: true,
          lineNumbersMinChars: 2,
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          wordWrap: "on",
        }}
      />
    </div>
  );
};

export default CodeEditor;
