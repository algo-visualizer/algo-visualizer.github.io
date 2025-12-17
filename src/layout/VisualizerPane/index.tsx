import React from "react";
import Visualizer from "./Visualizer";
import SnapshotOutput from "./SnapshotOutput";
import { type Snapshot, type LogEntry } from "../../types";

interface VisualizerPaneProps {
  snapshot: Snapshot | null;
  logs: LogEntry[];
  isActive: boolean;
}

const VisualizerPane: React.FC<VisualizerPaneProps> = ({
  snapshot,
  logs,
  isActive,
}) => {
  return (
    <div
      className={`bg-zinc-950 flex-col h-full lg:h-auto lg:w-1/2 ${
        isActive ? "flex" : "hidden lg:flex"
      }`}
    >
      <div className="flex-1 overflow-hidden min-h-0">
        <Visualizer snapshot={snapshot} />
      </div>
      <SnapshotOutput logs={logs} className="shrink-0" />
    </div>
  );
};

export default VisualizerPane;
