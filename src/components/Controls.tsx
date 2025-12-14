import React from "react";
import {
  SkipBack,
  SkipForward,
  PlayCircle,
  Loader2,
  Check,
} from "lucide-react";

interface ControlsProps {
  onVisualize: () => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  canPrev: boolean;
  isLoading: boolean;
  stepsInfo: string;
  isVisualized: boolean; // New prop
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
}) => {
  return (
    <div className="min-h-16 h-auto border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 lg:px-6 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {/* Visualize Button */}
      <button
        onClick={onVisualize}
        disabled={isLoading}
        className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-sm font-mono mr-4">
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
