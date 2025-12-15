import React, { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../types";

interface ConsoleProps {
  logs: LogEntry[];
  className?: string;
  onSendInput?: (value: string) => void;
  inputPlaceholder?: string;
}

const Console: React.FC<ConsoleProps> = ({
  logs,
  className,
  onSendInput,
  inputPlaceholder = "Type input and press Enter (not wired yet)",
}) => {
  const [inputValue, setInputValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when logs change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (onSendInput) {
      onSendInput(inputValue);
    }
    setInputValue("");
  };

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

        {/* Input row (placeholder for future stdin wiring) */}
        <form
          className="border-t border-zinc-800 bg-zinc-900/80 px-3 py-2 flex items-center gap-2"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="flex-1 bg-zinc-900 text-zinc-100 text-sm px-3 py-2 rounded-md border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            type="submit"
            className="px-3 py-2 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!onSendInput}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Console;
