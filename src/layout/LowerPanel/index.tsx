import React, { useMemo } from "react";
import { DiffEditor } from "@monaco-editor/react";
import Console from "./Console";
import { type PanelKey } from "../../types";
import { useUIStore } from "../../stores/useUIStore";
import { useVisualizationStore } from "../../stores/useVisualizationStore";
import { instrumentCode } from "../../python/instrumentation";

export { type PanelKey };

export const InstrumentedPanel = () => {
  const code = useVisualizationStore((state) => state.code);
  const breakpoints = useVisualizationStore((state) => state.breakpoints);

  const instrumentedCode = useMemo(() => {
    return instrumentCode(code, breakpoints).instrumentedCode;
  }, [code, breakpoints]);

  return (
    <DiffEditor
      height="100%"
      language="python"
      theme="vs-dark"
      original={code}
      modified={instrumentedCode}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        domReadOnly: true,
        renderSideBySide: true,
        originalEditable: false,
        wordWrap: "on",
      }}
    />
  );
};

export const ConsolePanel = () => {
  const logs = useVisualizationStore((state) => state.consoleLogs);
  return <Console className="h-full" logs={logs} />;
};

const LowerPanel: React.FC = () => {
  const activePanel = useUIStore((state) => state.activePanel);

  if (!activePanel) return null;

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900">
      <div className="h-64 border-t border-zinc-800 relative">
        {activePanel === "instrumented" && <InstrumentedPanel />}
        {activePanel === "console" && <ConsolePanel />}
      </div>
    </div>
  );
};

export default LowerPanel;
