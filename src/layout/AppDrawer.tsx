import React from "react";
import { BookOpen, X } from "lucide-react";
import { useVisualizationStore } from "../stores/useVisualizationStore";
import { useUIStore } from "../stores/useUIStore";

const AppDrawer: React.FC = () => {
  const isCodeExecutorReady = useVisualizationStore(
    (state) => state.isCodeExecutorReady,
  );
  const isLSPReady = useVisualizationStore((state) => state.isLSPReady);
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const setIsMenuOpen = useUIStore((state) => state.setIsMenuOpen);

  if (!isMenuOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      onClick={() => setIsMenuOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      <div
        className="absolute left-0 top-0 h-full w-72 bg-zinc-900 border-r border-zinc-700 shadow-2xl animate-in slide-in-from-left duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
          <h2 className="text-lg tracking-tight bg-white bg-clip-text text-transparent">
            Algo Visualizer
          </h2>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {(!isCodeExecutorReady || !isLSPReady) && (
            <div className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </p>
              {!isCodeExecutorReady && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                  <span>Loading code execution backend</span>
                </div>
              )}
              {!isLSPReady && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                  <span>Loading LSP</span>
                </div>
              )}
            </div>
          )}

          <p className="px-3 pt-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Navigation
          </p>
          <a
            href="/docs/visual.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-200 group"
            onClick={() => setIsMenuOpen(false)}
          >
            <BookOpen className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span>API Reference</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AppDrawer;
