import React from "react";
import { type Snapshot, type GraphUnion } from "../types";
import ArrayVisualizer from "./ArrayVisualizer";
import NodesVisualizer from "./NodesVisualizer";

interface VisualizerProps {
  snapshot: Snapshot | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ snapshot }) => {
  if (!snapshot) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-500">
        Run code to see variables
      </div>
    );
  }

  // Helper to render individual graph items based on type
  const renderGraphItem = (key: string, item: GraphUnion) => {
    switch (item.type) {
      case "array":
        return <ArrayVisualizer key={key} name={key} data={item} />;

      case "nodes":
        if (typeof item.content === "string") {
          return (
            <div key={key} className="text-zinc-500">
              {item.content}
            </div>
          );
        }
        return <NodesVisualizer key={key} name={key} data={item.content} />;

      case "var":
        return (
          <div
            key={key}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
          >
            <div className="text-zinc-400 text-sm font-medium mb-1">{key}</div>
            <span className="text-emerald-400 font-mono break-all">
              {item.content}
            </span>
          </div>
        );

      default:
        return (
          <div
            key={key}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm"
          >
            {key}: {item.type} (Not implemented)
          </div>
        );
    }
  };

  const allKeys = Object.keys(snapshot.graph_group).sort();

  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-semibold mb-6 text-zinc-100 flex items-center gap-2">
        Visualizer
        <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
          Line {snapshot.line}
        </span>
      </h2>

      {allKeys.length === 0 ? (
        <div className="text-zinc-500 italic">No variables in scope.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {allKeys.map((key) =>
            renderGraphItem(key, snapshot.graph_group[key]!),
          )}
        </div>
      )}
    </div>
  );
};

export default Visualizer;
