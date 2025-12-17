import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LogEntry } from "../../types";

interface SnapshotOutputProps {
  logs: LogEntry[];
  className?: string;
}

const SnapshotOutput: React.FC<SnapshotOutputProps> = ({ logs, className }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (!isCollapsed && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isCollapsed]);

  return (
    <div
      className={`flex flex-col border-t border-zinc-800 bg-zinc-950 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 uppercase tracking-wider transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Snapshot Output
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 max-h-64 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
            {logs.length === 0 && (
              <div className="text-zinc-600 italic select-none">
                Snapshot output will appear here...
              </div>
            )}

            {logs.map((log, i) => (
              <div key={i} className="break-all whitespace-pre-wrap flex gap-2">
                {/* Timestamp or icon could go here */}
                <span
                  className={`
                    ${log.type === "stdout" ? "text-zinc-300" : ""}
                 `}
                >
                  {log.content}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotOutput;
