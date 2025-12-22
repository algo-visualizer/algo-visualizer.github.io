import React from "react";
import { BookOpen, Menu } from "lucide-react";

interface AppHeaderProps {
  isPyodideReady: boolean;
  isLSPReady: boolean;
  onOpenMenu: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  isPyodideReady,
  isLSPReady,
  onOpenMenu,
}) => {
  return (
    <div className="h-12 border-b border-zinc-800 flex items-center px-4 bg-zinc-900 shrink-0">
      {/* Hamburger Menu Button - visible only on small screens */}
      <button
        onClick={onOpenMenu}
        className="md:hidden mr-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-lg tracking-tight bg-white bg-clip-text text-transparent">
        Algo Visualizer
      </h1>
      <span className="mx-3 text-zinc-600 hidden sm:inline">|</span>
      <span className="text-xs text-zinc-500 hidden sm:inline">
        Python Interactive Visualizer
      </span>
      <span className="mx-3 text-zinc-600 hidden md:inline">|</span>
      {/* Loading Status Indicators */}
      <div className="hidden md:flex items-center gap-3">
        {!isPyodideReady && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className="w-3 h-3 border-[1.5px] border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            <span className="hidden sm:inline">Loading Pyodide backend</span>
          </div>
        )}

        {!isLSPReady && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className="w-3 h-3 border-[1.5px] border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            <span className="hidden sm:inline">Loading Python LSP</span>
          </div>
        )}
      </div>

      <a
        href="/docs/visual.html"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-700/70 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 group"
      >
        <BookOpen className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        <span>API Reference</span>
      </a>
    </div>
  );
};

export default AppHeader;
