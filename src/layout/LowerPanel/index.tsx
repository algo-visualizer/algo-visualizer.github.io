import React from "react";
import { DiffEditor } from "@monaco-editor/react";
import Console from "./Console";
import { type LogEntry } from "../../types";

export type PanelKey = "instrumented" | "console" | null;

export interface PanelDefinition {
  key: Exclude<PanelKey, null>;
  label: string;
  render: () => React.ReactNode;
}

interface LowerPanelProps {
  activePanel: PanelKey;
  panels: PanelDefinition[];
}

const LowerPanel: React.FC<LowerPanelProps> = ({ activePanel, panels }) => {
  const activeDef = panels.find((p) => p.key === activePanel && activePanel);

  if (!activeDef) return null;

  return (
    <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900">
      <div className="h-64 border-t border-zinc-800 relative">
        {activeDef.render()}
      </div>
    </div>
  );
};

export const InstrumentedPanel = ({
  original,
  modified,
}: {
  original: string;
  modified: string;
}) => (
  <DiffEditor
    height="100%"
    language="python"
    theme="vs-dark"
    original={original}
    modified={modified}
    options={{
      readOnly: true,
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      domReadOnly: true,
      renderSideBySide: true,
      originalEditable: false,
    }}
  />
);

export const ConsolePanel = ({ logs }: { logs: LogEntry[] }) => (
  <Console className="h-full" logs={logs} />
);

export default LowerPanel;
