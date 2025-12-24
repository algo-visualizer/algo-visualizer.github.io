import React, { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { type Monaco, type MonacoEditor } from "./types";
import { useLSP, useBreakpoints, useActiveLineDecoration } from "./hooks";

interface EditorProps {
  value: string;
  breakpoints: Set<number>;
  activeLine: number | null;
  toggleBreakpoint: (line: number) => void;
  onChange: (value: string | undefined) => void;
  onBreakpointsChange: (newBreakpoints: Set<number>) => void;
}

const CodeEditor: React.FC<EditorProps> = ({
  value,
  breakpoints,
  activeLine,
  toggleBreakpoint,
  onChange,
  onBreakpointsChange,
}) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const registerProvidersRef = useRef<((monaco: Monaco) => void) | null>(null);

  const onLSPReady = useCallback(() => {
    // Re-register providers when worker is ready (handled by useLSP)
    // This is crucial for worker resets
    if (monacoRef.current && registerProvidersRef.current) {
      registerProvidersRef.current(monacoRef.current);
    }
  }, []);

  // LSP Worker and Provider management handled by hook
  const { registerProviders } = useLSP({ onLSPReady });

  // Keep ref in sync
  useEffect(() => {
    registerProvidersRef.current = registerProviders;
  }, [registerProviders]);

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
    <div className="h-full w-full">
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
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
