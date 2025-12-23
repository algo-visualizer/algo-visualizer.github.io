import React from "react";
import { useUIStore } from "../stores/useUIStore";

const MobileTabs: React.FC = () => {
  const activeMobileTab = useUIStore((state) => state.activeMobileTab);
  const setActiveMobileTab = useUIStore((state) => state.setActiveMobileTab);

  return (
    <div className="lg:hidden flex border-t border-zinc-800 bg-zinc-900 h-12">
      <button
        onClick={() => setActiveMobileTab("editor")}
        className={`flex-1 text-sm font-medium ${
          activeMobileTab === "editor"
            ? "text-emerald-400 bg-zinc-800/50"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        Code
      </button>
      <div className="w-px bg-zinc-800" />
      <button
        onClick={() => setActiveMobileTab("visualizer")}
        className={`flex-1 text-sm font-medium ${
          activeMobileTab === "visualizer"
            ? "text-blue-400 bg-zinc-800/50"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        Visualizer
      </button>
    </div>
  );
};

export default MobileTabs;
