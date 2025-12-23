import React, { useMemo } from "react";
import Visualizer from "./Visualizer";
import SnapshotOutput from "./SnapshotOutput";
import { type LogEntry } from "../../types";
import { useVisualizationStore } from "../../stores/useVisualizationStore";

interface VisualizerPaneProps {
  isActive: boolean;
}

const VisualizerPane: React.FC<VisualizerPaneProps> = ({ isActive }) => {
  const history = useVisualizationStore((state) => state.history);
  const currentStep = useVisualizationStore((state) => state.currentStep);

  // Derived state
  const snapshot = history[currentStep] || null;

  // Derive logs from snapshot history up to currentStep
  const logs = useMemo(() => {
    if (currentStep < 0 || !history.length) return [];

    const newLogs: LogEntry[] = [];
    // We iterate from 0 to currentStep inclusive
    for (let i = 0; i <= currentStep; i++) {
      const snap = history[i];
      if (!snap) continue;
      if (snap.stdout) {
        newLogs.push({
          type: "stdout",
          content: snap.stdout,
          timestamp: i, // Use step index as pseudo-timestamp
        });
      }
    }
    return newLogs;
  }, [history, currentStep]);

  return (
    <div
      className={`bg-zinc-950 flex-col h-full ${
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
