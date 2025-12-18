import React, { type ReactNode, type SetStateAction } from "react";
import CodeEditor from "./Editor";
import { AlertCircle } from "lucide-react";

interface EditorPaneProps {
  code: string;
  onChange: (val: string) => void;
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  onBreakpointsChange: (newBreakpoints: Set<number>) => void;
  onLSPReady: () => void;
  activeLine: number | null;
  error: string | null;
  setError: (val: SetStateAction<string | null>) => void;
  isActive: boolean;
  children?: ReactNode;
}

const EditorPane: React.FC<EditorPaneProps> = ({
  code,
  onChange,
  breakpoints,
  toggleBreakpoint,
  onBreakpointsChange,
  onLSPReady,
  activeLine,
  error,
  setError,
  isActive,
  children,
}) => {
  return (
    <div
      className={`flex-col border-r border-zinc-800 h-full ${
        isActive ? "flex" : "hidden lg:flex"
      }`}
    >
      <div className="grow flex flex-col min-h-0">
        <div className="grow relative min-h-0">
          <CodeEditor
            value={code}
            onChange={(val) => onChange(val || "")}
            breakpoints={breakpoints}
            toggleBreakpoint={toggleBreakpoint}
            onBreakpointsChange={onBreakpointsChange}
            onLSPReady={onLSPReady}
            activeLine={activeLine}
          />

          {error && (
            <div className="absolute top-4 right-4 max-w-md bg-red-950/90 border border-red-800 text-red-200 p-3 rounded-md text-sm shadow-xl flex gap-2 animate-in fade-in slide-in-from-top-2 z-20">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-32">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};

export default EditorPane;
