import React, { useState, useEffect } from "react";
import { X, Package, RefreshCw } from "lucide-react";
import { useUIStore } from "../stores/useUIStore";
import { useWorkerStore } from "../stores/useWorkerStore";

const Settings: React.FC = () => {
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useUIStore((state) => state.setIsSettingsOpen);
  const resetAllWorkers = useWorkerStore((state) => state.resetAllWorkers);
  const [activeTab, setActiveTab] = useState<"packages">("packages");
  const [packages, setPackages] = useState<string>("");
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const storedPackages = localStorage.getItem("pyodide_packages");
    if (storedPackages) {
      setPackages(storedPackages);
    }
  }, []);

  const handleSave = (value: string) => {
    setPackages(value);
    localStorage.setItem("pyodide_packages", value);
  };

  const handleReloadEnvironment = () => {
    setIsReloading(true);
    resetAllWorkers();
    // Reset the button state after a short delay
    setTimeout(() => setIsReloading(false), 1000);
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] md:h-[600px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between md:block">
            <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="md:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-none">
            <button
              onClick={() => setActiveTab("packages")}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "packages"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              <Package className="w-4 h-4" />
              Packages
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h3 className="text-lg font-medium text-zinc-100 capitalize">
              {activeTab}
            </h3>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="hidden md:block p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            {activeTab === "packages" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 mb-1">
                    Python Packages
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4">
                    Enter the names of Python packages you want to install (one
                    per line). These will be installed when the environment
                    initializes.
                    <br />
                    Example:
                    <br />
                    <code className="text-emerald-400">numpy</code>
                    <br />
                    <code className="text-emerald-400">pandas==1.5.0</code>
                  </p>
                </div>
                <textarea
                  className="w-full h-48 md:h-48 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none placeholder:text-zinc-600"
                  placeholder="numpy&#10;micrograd"
                  value={packages}
                  onChange={(e) => handleSave(e.target.value)}
                  spellCheck={false}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReloadEnvironment}
                    disabled={isReloading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isReloading ? "animate-spin" : ""}`}
                    />
                    {isReloading ? "Reloading..." : "Reload Environment"}
                  </button>
                </div>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-500">
                    Click "Reload Environment" to apply package changes. Only
                    pure Python packages or packages with Pyodide wheels are
                    supported.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
