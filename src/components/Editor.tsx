import React, { useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
// @ts-ignore
import PythonLspWorker from "../workers/pythonLspWorker?worker";

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

  const workerRef = useRef<Worker | null>(null);
  const completionProviderRef = useRef<any>(null);
  const hoverProviderRef = useRef<any>(null);

  // Flag to prevent update loops
  const isSyncingRef = useRef(false);

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

    // 1. Click handler for gutter (toggling)
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position.lineNumber;
        toggleBreakpoint(line);
      }
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
