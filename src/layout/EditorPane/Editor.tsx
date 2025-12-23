import React, { useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { type Monaco, type MonacoEditor } from "./types";
import "./style.css";
import { useLSPWorker, useBreakpoints, useActiveLineDecoration } from "./hooks";

interface EditorProps {
  value: string;
  breakpoints: Set<number>;
  activeLine: number | null;
  toggleBreakpoint: (line: number) => void;
  onChange: (value: string | undefined) => void;
  onBreakpointsChange: (newBreakpoints: Set<number>) => void;
  onLSPReady: () => void;
}

const CodeEditor: React.FC<EditorProps> = ({
  value,
  breakpoints,
  activeLine,
  toggleBreakpoint,
  onChange,
  onBreakpointsChange,
  onLSPReady,
}) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // LSP Worker and Provider management handled by hook
  const { registerProviders } = useLSPWorker({ onLSPReady });

  // Breakpoint management
  const { setupBreakpointHandlers } = useBreakpoints(editorRef, monacoRef, {
    breakpoints,
    toggleBreakpoint,
    onBreakpointsChange,
  });

  // Active line decoration
  useActiveLineDecoration(editorRef, monacoRef, activeLine);

  const onEditorMount: OnMount = useCallback(
    (editor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Setup breakpoint handlers (gutter click, drag, sticky)
      setupBreakpointHandlers(editor, monaco);

      // Register LSP providers via the hook's helper
      registerProviders(monaco);
    },
    [setupBreakpointHandlers, registerProviders],
  );

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={onEditorMount}
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
