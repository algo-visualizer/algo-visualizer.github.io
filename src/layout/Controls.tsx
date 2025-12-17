import React from "react";
import {
  SkipBack,
  SkipForward,
  PlayCircle,
  Loader2,
  Check,
  Eye,
  Terminal,
} from "lucide-react";

interface ControlsProps {
  onVisualize: () => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  canPrev: boolean;
  isLoading: boolean;
  stepsInfo: string;
  isVisualized: boolean;
  onToggleInstrumented: () => void;
  showInstrumented: boolean;
  onToggleConsole: () => void;
  showConsole: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  onVisualize,
  onNext,
  onPrev,
  canNext,
  canPrev,
  isLoading,
  stepsInfo,
  isVisualized,
  onToggleInstrumented,
  showInstrumented,
  onToggleConsole,
  showConsole,
}) => {
  return (
    <div className="min-h-16 h-auto border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 lg:px-6 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 md:gap-3.5">
        {/* Visualize Button */}
        <button
          onClick={onVisualize}
          disabled={isLoading}
          className="flex h-10 items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isVisualized ? (
            <Check className="w-4 h-4 text-emerald-600 stroke-[3px]" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          Visualize
        </button>
        {/* Instrumented Code Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              onClick={onToggleInstrumented}
              aria-pressed={showInstrumented}
              aria-label="Toggle instrumented code preview"
              className={`h-10 w-10 flex items-center justify-center rounded-md border text-zinc-400 bg-zinc-900 transition-colors focus:outline-none focus:ring-offset-0 focus:ring-offset-zinc-900
              ${showInstrumented ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-300" : "border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"}
            `}
            >
              <Eye className="w-4 h-4" />
            </button>
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-10 whitespace-nowrap px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden sm:block">
              Preview instrumented code
            </span>
          </div>

          <div className="relative group">
            <button
              onClick={onToggleConsole}
              aria-pressed={showConsole}
              aria-label="Toggle console"
              className={`h-10 w-10 flex items-center justify-center rounded-md border text-zinc-400 bg-zinc-900 transition-colors focus:outline-none focus:ring-offset-0 focus:ring-offset-zinc-900
              ${showConsole ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-300" : "border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"}
            `}
            >
              <Terminal className="w-4 h-4" />
            </button>
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-10 whitespace-nowrap px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden sm:block">
              Toggle console
            </span>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-sm font-mono mr-4 whitespace-nowrap min-w-12 text-right">
          {stepsInfo}
        </span>

        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="p-2 hover:bg-zinc-800 rounded text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        <button
          onClick={onNext}
          disabled={!canNext}
          className="p-2 hover:bg-zinc-800 rounded text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default Controls;
