import React, { useEffect, useRef } from "react";
import type { LogEntry } from "../../types";

interface ConsoleProps {
  logs: LogEntry[];
  className?: string;
}

const Console: React.FC<ConsoleProps> = ({ logs, className }) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when logs change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div
      className={`flex flex-col border-t border-zinc-800 bg-zinc-950 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Console
        </div>
        {/* Placeholder for future actions (clear, filter) */}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 h-56">
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
          {logs.length === 0 && (
            <div className="text-zinc-600 italic select-none">
              Stdout will appear here...
            </div>
          )}

          {logs.map((log, i) => (
            <div key={i} className="break-all whitespace-pre-wrap flex gap-2">
              <span
                className={`
                    ${log.type === "stdout" ? "text-zinc-200" : "text-zinc-400"}
                 `}
              >
                {log.content}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default Console;
