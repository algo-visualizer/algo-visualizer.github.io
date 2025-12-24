import React, { type ReactNode } from "react";
import CodeEditor from "./Editor";
import { AlertCircle } from "lucide-react";
import { useVisualizationStore } from "../../stores/useVisualizationStore";
import "./style.css";

interface EditorPaneProps {
  isActive: boolean;
  children?: ReactNode;
}

const EditorPane: React.FC<EditorPaneProps> = ({ isActive, children }) => {
  const code = useVisualizationStore((state) => state.code);
  const breakpoints = useVisualizationStore((state) => state.breakpoints);
  const error = useVisualizationStore((state) => state.error);
  const history = useVisualizationStore((state) => state.history);
  const currentStep = useVisualizationStore((state) => state.currentStep);
  const setCode = useVisualizationStore((state) => state.setCode);
  const toggleBreakpoint = useVisualizationStore(
    (state) => state.toggleBreakpoint,
  );
  const setError = useVisualizationStore((state) => state.setError);
  const setBreakpoints = useVisualizationStore((state) => state.setBreakpoints);

  const currentSnapshot = history[currentStep] || null;
  const activeLine = currentSnapshot ? currentSnapshot.line : null;

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
            onChange={(val) => setCode(val || "")}
            breakpoints={breakpoints}
            toggleBreakpoint={toggleBreakpoint}
            onBreakpointsChange={setBreakpoints}
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
