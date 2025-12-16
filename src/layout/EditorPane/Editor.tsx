import React, { useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
// @ts-ignore
import PythonLspWorker from "../../workers/pythonLspWorker?worker";

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

  // Inject breakpoint glyph style locally so we don't rely on global index.html
  useEffect(() => {
    const styleId = "monaco-breakpoint-glyph-style";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.textContent = `
        .breakpoint-glyph {
          background: rgba(255, 0, 0, 0.6);
          border-radius: 50%;
          width: 12px !important;
          height: 12px !important;
          margin-left: 5px;
          margin-top: 5px;
          cursor: pointer;
        }
        .breakpoint-range-line {
          background: rgba(255, 0, 0, 0.12);
        }
        .breakpoint-range-glyph {
          border-left: 3px solid rgba(255, 0, 0, 0.4);
          margin-left: 4px;
          height: 100%;
        }
      `;
      document.head.appendChild(styleTag);
    }

    return () => {
      // Only remove if we were the ones to add it
      if (styleTag && styleTag.parentElement) {
        styleTag.parentElement.removeChild(styleTag);
      }
    };
  }, []);

  // Separate refs to manage decorations independently
  const bpDecorationsRef = useRef<string[]>([]);
  const activeDecorationsRef = useRef<string[]>([]);
  const previewDecorationsRef = useRef<string[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const completionProviderRef = useRef<any>(null);
  const hoverProviderRef = useRef<any>(null);
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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Completion Provider
    if (!completionProviderRef.current) {
      completionProviderRef.current =
        monaco.languages.registerCompletionItemProvider("python", {
          triggerCharacters: ["."],
          provideCompletionItems: (model: any, position: any) => {
            const worker = workerRef.current;
            if (!worker) return { suggestions: [] };

            const code = model.getValue();
            const requestId = Math.random().toString(36).substring(7);

            return new Promise((resolve) => {
              const handler = (e: MessageEvent) => {
                if (e.data.id === requestId) {
                  worker.removeEventListener("message", handler);

                  const word = model.getWordUntilPosition(position);
                  const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                  };

                  const suggestions = e.data.results.map((item: any) => {
                    let kind = monaco.languages.CompletionItemKind.Text;
                    switch (item.kind) {
                      case "function":
                        kind = monaco.languages.CompletionItemKind.Function;
                        break;
                      case "keyword":
                        kind = monaco.languages.CompletionItemKind.Keyword;
                        break;
                      case "module":
                        kind = monaco.languages.CompletionItemKind.Module;
                        break;
                      case "class":
                        kind = monaco.languages.CompletionItemKind.Class;
                        break;
                      case "instance":
                        kind = monaco.languages.CompletionItemKind.Variable;
                        break;
                      case "statement":
                        kind = monaco.languages.CompletionItemKind.Variable;
                        break;
                      case "param":
                        kind = monaco.languages.CompletionItemKind.Variable;
                        break;
                      default:
                        kind = monaco.languages.CompletionItemKind.Text;
                    }

                    return {
                      label: item.label,
                      kind: kind,
                      detail: item.detail,
                      insertText: item.insertText,
                      range: range,
                    } as any;
                  });

                  resolve({ suggestions });
                }
              };

              worker.addEventListener("message", handler);
              worker.postMessage({
                id: requestId,
                type: "complete",
                code: code,
                line: position.lineNumber,
                column: position.column - 1,
              });
            });
          },
        });
    }

    // Register Hover Provider
    if (!hoverProviderRef.current) {
      hoverProviderRef.current = monaco.languages.registerHoverProvider(
        "python",
        {
          provideHover: (model: any, position: any) => {
            const worker = workerRef.current;
            if (!worker) return null;

            const code = model.getValue();
            const requestId = Math.random().toString(36).substring(7);

            return new Promise((resolve) => {
              const handler = (e: MessageEvent) => {
                if (e.data.id === requestId) {
                  worker.removeEventListener("message", handler);
                  const result = e.data.result;

                  if (!result) {
                    resolve(null);
                    return;
                  }

                  // Construct hover contents
                  // result = { code, docstring, type }
                  const contents = [];

                  // 1. Code Signature
                  if (result.code) {
                    contents.push({
                      value: "```python\n" + result.code + "\n```",
                    });
                  } else if (result.name) {
                    contents.push({
                      value: "```python\n" + result.name + "\n```",
                    });
                  }

                  // 2. Docstring (already formatted or plain text, Monaco handles md)
                  if (result.docstring) {
                    // Add a separator or just append
                    contents.push({ value: result.docstring });
                  }

                  resolve({
                    contents: contents,
                  });
                }
              };

              worker.addEventListener("message", handler);
              worker.postMessage({
                id: requestId,
                type: "hover",
                code: code,
                line: position.lineNumber,
                column: position.column - 1,
              });
            });
          },
        },
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
    const monaco = monacoRef.current;

    const newDecorations: any[] = [];
    breakpoints.forEach((line) => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
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
          className: "bg-yellow-900/50 border-l-2 border-yellow-500",
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
        }}
      />
    </div>
  );
};

export default CodeEditor;
