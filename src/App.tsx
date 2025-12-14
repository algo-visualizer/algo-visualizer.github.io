import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DiffEditor } from "@monaco-editor/react";
import CodeEditor from "./components/Editor";
import Visualizer from "./components/Visualizer";
import Controls from "./components/Controls";
import SnapshotOutput from "./components/SnapshotOutput";
import { loadPyodideService, runUserCode } from "./services/pyodideService";
import { instrumentCode } from "./utils/instrumentation";
import { INITIAL_CODE_2 } from "./constants";
import { type Snapshot, type LogEntry } from "./types";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const App: React.FC = () => {
  // State
  const [code, setCode] = useState<string>(INITIAL_CODE_2);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isLSPReady, setIsLSPReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showInstrumented, setShowInstrumented] = useState(false);
  const [isVisualized, setIsVisualized] = useState(false);

  // Execution State
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<
    "editor" | "visualizer"
  >("editor");

  // Hamburger Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load Pyodide on mount
  useEffect(() => {
    loadPyodideService(() => setIsPyodideReady(true)).catch((err) => {
      console.error("Failed to load Pyodide:", err);
      setError("Failed to load Python environment. Please refresh.");
    });
  }, []);

  const handleLSPReady = () => {
    setIsLSPReady(true);
  };

  // Handlers
  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }, []);

  // Handle breakpoint shifts (e.g., when adding new lines above a breakpoint)
  const handleBreakpointsChange = useCallback((newBreakpoints: Set<number>) => {
    setBreakpoints(newBreakpoints);
  }, []);

  // Reset visualization status when inputs change
  useEffect(() => {
    setIsVisualized(false);
  }, [code, breakpoints]);

  const handleVisualize = async () => {
    if (!isPyodideReady) return;
    setIsExecuting(true);
    setError(null);
    setHistory([]);
    setCurrentStep(-1);

    try {
      const result = await runUserCode(code, breakpoints);

      if (result.error) {
        setError(result.error);
        setHistory([]);
      } else {
        setHistory(result.snapshots);
        if (result.snapshots.length > 0) {
          setCurrentStep(0);
          setIsVisualized(true);
        } else {
          // No snapshots captured (maybe no breakpoints hit or code finished without hitting)
          if (breakpoints.size > 0) {
            setError("Code executed but no breakpoints were hit.");
          } else {
            setError("Add breakpoints (click the gutter) to visualize state.");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsExecuting(false);
      // Auto-switch to visualizer tab on mobile if visualization started successfully
      if (!error && activeMobileTab === "editor" && window.innerWidth < 1024) {
        setActiveMobileTab("visualizer");
      }
    }
  };

  const nextStep = () => {
    if (currentStep < history.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Derived state
  const currentSnapshot = history[currentStep] || null;
  const activeLine = currentSnapshot ? currentSnapshot.line : null;

  // Derive logs from history up to currentStep
  const logs = useMemo(() => {
    if (currentStep < 0 || !history.length) return [];

    const newLogs: LogEntry[] = [];
    // We iterate from 0 to currentStep inclusive
    for (let i = 0; i <= currentStep; i++) {
      const snapshot = history[i];
      if (!snapshot) continue;
      if (snapshot.stdout) {
        newLogs.push({
          type: "stdout",
          content: snapshot.stdout,
          timestamp: i, // Use step index as pseudo-timestamp or just 0
        });
      }
    }
    return newLogs;
  }, [history, currentStep]);

  // Calculate instrumented code for preview
  const instrumentedCodePreview = useMemo(() => {
    if (!showInstrumented) return "";
    return instrumentCode(code, breakpoints).instrumentedCode;
  }, [code, breakpoints, showInstrumented]);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header (Minimal) */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 bg-zinc-900 flex-shrink-0">
        {/* Hamburger Menu Button - visible only on small screens */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden mr-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
          Algo Visualizer
        </h1>
        <span className="mx-3 text-zinc-600 hidden sm:inline">|</span>
        <span className="text-xs text-zinc-500 hidden sm:inline">
          Python Interactive Visualizer
        </span>
        <span className="mx-3 text-zinc-600 hidden md:inline">|</span>
        {/* Loading Status Indicators */}
        <div className="hidden md:flex items-center gap-3">
          {/* Pyodide Loading Indicator */}
          {!isPyodideReady && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <div className="w-3 h-3 border-[1.5px] border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <span className="hidden sm:inline">Loading Pyodide backend</span>
            </div>
          )}

          {/* LSP Loading Indicator */}
          {!isLSPReady && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <div className="w-3 h-3 border-[1.5px] border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <span className="hidden sm:inline">Loading Python LSP</span>
            </div>
          )}
        </div>

        {/* API Documentation Button - visible only on medium+ screens */}
        <a
          href="/docs/visual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-700/70 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 group"
        >
          <BookOpen className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
          <span>API Docs</span>
        </a>
      </div>

      {/* Drawer Menu Overlay - visible only when menu is open on small screens */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Drawer Panel */}
          <div
            className="absolute left-0 top-0 h-full w-72 bg-zinc-900 border-r border-zinc-700 shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
              <h2 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
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

            {/* Drawer Content */}
            <div className="p-4 space-y-2">
              {/* Loading Status in Drawer */}
              {(!isPyodideReady || !isLSPReady) && (
                <div className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </p>
                  {!isPyodideReady && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                      <span>Loading Pyodide backend</span>
                    </div>
                  )}
                  {!isLSPReady && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                      <span>Loading Python LSP</span>
                    </div>
                  )}
                </div>
              )}

              {/* Menu Items */}
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
                <span>API Documentation</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Editor & Watch Panel */}
        <div
          className={`flex-col border-r border-zinc-800 h-full lg:h-auto lg:w-1/2 ${
            activeMobileTab === "editor" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Editor & Preview Container */}
          <div className="flex-grow flex flex-col min-h-0">
            {/* Editor Section (Upper) */}
            <div className="flex-grow relative min-h-0">
              <CodeEditor
                value={code}
                onChange={(val) => setCode(val || "")}
                breakpoints={breakpoints}
                toggleBreakpoint={toggleBreakpoint}
                onBreakpointsChange={handleBreakpointsChange}
                onLSPReady={handleLSPReady}
                activeLine={activeLine}
              />

              {/* Error Toast Overlay in Editor */}
              {error && (
                <div className="absolute top-4 right-4 max-w-md bg-red-950/90 border border-red-800 text-red-200 p-3 rounded-md text-sm shadow-xl flex gap-2 animate-in fade-in slide-in-from-top-2 z-20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-32">
                    {error}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Instrumented Code Preview (Collapsible) */}
            <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900">
              <button
                onClick={() => setShowInstrumented(!showInstrumented)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {showInstrumented ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Preview Instrumented Code
              </button>

              {showInstrumented && (
                <div className="h-64 border-t border-zinc-800 relative">
                  <DiffEditor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    original={code}
                    modified={instrumentedCodePreview}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      domReadOnly: true,
                      renderSideBySide: true,
                      originalEditable: false,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visualizer & Console */}
        <div
          className={`bg-zinc-950 flex-col h-full lg:h-auto lg:w-1/2 ${
            activeMobileTab === "visualizer" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="flex-1 overflow-hidden min-h-0">
            <Visualizer snapshot={currentSnapshot} />
          </div>
          <SnapshotOutput logs={logs} className="flex-shrink-0" />
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on small screens) */}
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

      {/* Footer Controls */}
      <Controls
        onVisualize={handleVisualize}
        onNext={nextStep}
        onPrev={prevStep}
        canNext={currentStep < history.length - 1}
        canPrev={currentStep > 0}
        isLoading={isExecuting || !isPyodideReady}
        stepsInfo={
          history.length > 0 ? `${currentStep + 1} / ${history.length}` : ""
        }
        isVisualized={isVisualized}
      />
    </div>
  );
};

export default App;
