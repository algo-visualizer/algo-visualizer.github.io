import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { loadPyodideService, runUserCode } from "./services/pyodideService";
import { instrumentCode } from "./utils/instrumentation";
import { INITIAL_CODE_2 } from "./constants";
import { type Snapshot, type LogEntry } from "./types";
import AppHeader from "./layout/AppHeader";
import AppDrawer from "./layout/AppDrawer";
import MobileTabs from "./layout/MobileTabs";
import EditorPane from "./layout/EditorPane/index";
import VisualizerPane from "./layout/VisualizerPane/index";
import Controls from "./layout/Controls";
import LowerPanel, {
  InstrumentedPanel,
  ConsolePanel,
  type PanelKey,
} from "./layout/LowerPanel/index";

const App: React.FC = () => {
  // State
  const [code, setCode] = useState<string>(INITIAL_CODE_2);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isLSPReady, setIsLSPReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [isVisualized, setIsVisualized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Execution State
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([]);
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
    loadPyodideService({
      onPyodideReady: () => {
        setConsoleLogs([]);
        setIsPyodideReady(true);
      },
      batchedStdoutResolve: (output) => {
        setConsoleLogs((prev) => [
          ...prev,
          { type: "stdout", content: output, timestamp: Date.now() },
        ]);
      },
    }).catch((err) => {
      console.error("Failed to load Pyodide:", err);
      setError("Failed to load Python environment. Please refresh.");
    });
  }, []);

  // Track desktop breakpoint (lg: 1024px)
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateMatch = () => setIsDesktop(media.matches);
    updateMatch();
    media.addEventListener("change", updateMatch);
    return () => media.removeEventListener("change", updateMatch);
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
    let hasError = false;
    setError(null);
    setHistory([]);
    setConsoleLogs([]);
    setCurrentStep(-1);

    try {
      const result = await runUserCode(code, breakpoints);

      if (result.error) {
        hasError = true;
        setError(result.error);
        setHistory([]);
      } else {
        setHistory(result.snapshots);
        if (result.snapshots.length > 0) {
          setCurrentStep(0);
          setIsVisualized(true);
        } else {
          hasError = true;
          // No snapshots captured (maybe no breakpoints hit or code finished without hitting)
          if (breakpoints.size > 0) {
            setError("Code executed but no breakpoints were hit.");
          } else {
            setError("Add breakpoints (click the gutter) to visualize state.");
          }
        }
      }
    } catch (err: any) {
      hasError = true;
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsExecuting(false);
      // Auto-switch to visualizer tab on mobile if visualization started successfully
      if (!hasError && activeMobileTab === "editor" && !isDesktop) {
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

  const togglePanel = (panel: PanelKey) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  // Placeholder for future layout persistence
  const handleLayoutChange = useCallback((layout: Record<string, number>) => {
    // e.g., localStorage.setItem("panel-layout", JSON.stringify(layout));
    void layout;
  }, []);

  // Derive logs from snapshot history up to currentStep
  const snapshotLogs = useMemo(() => {
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
    if (activePanel !== "instrumented") return "";
    return instrumentCode(code, breakpoints).instrumentedCode;
  }, [code, breakpoints, activePanel]);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100">
      <AppHeader
        isPyodideReady={isPyodideReady}
        isLSPReady={isLSPReady}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      <AppDrawer
        isMenuOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isPyodideReady={isPyodideReady}
        isLSPReady={isLSPReady}
      />

      {/* Main Content Area */}
      {isDesktop ? (
        <Group
          orientation="horizontal"
          className="flex-1 flex flex-col lg:flex-row overflow-hidden relative"
          defaultLayout={{ left: 50, right: 50 }}
          onLayoutChange={handleLayoutChange}
        >
          <Panel id="left" className="min-w-0 h-full">
            <EditorPane
              code={code}
              onChange={setCode}
              breakpoints={breakpoints}
              toggleBreakpoint={toggleBreakpoint}
              onBreakpointsChange={handleBreakpointsChange}
              onLSPReady={handleLSPReady}
              activeLine={activeLine}
              error={error}
              setError={setError}
              isActive
            >
              <LowerPanel
                activePanel={activePanel}
                panels={[
                  {
                    key: "instrumented",
                    label: "Instrumented",
                    render: () => (
                      <InstrumentedPanel
                        original={code}
                        modified={instrumentedCodePreview}
                      />
                    ),
                  },
                  {
                    key: "console",
                    label: "Console",
                    render: () => <ConsolePanel logs={consoleLogs} />,
                  },
                ]}
              />
            </EditorPane>
          </Panel>

          <Separator className="w-3 bg-zinc-900 hover:bg-zinc-800 transition-colors" />

          <Panel id="right" className="min-w-0 h-full">
            <VisualizerPane
              snapshot={currentSnapshot}
              logs={snapshotLogs}
              isActive
            />
          </Panel>
        </Group>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          <EditorPane
            code={code}
            onChange={setCode}
            breakpoints={breakpoints}
            toggleBreakpoint={toggleBreakpoint}
            onBreakpointsChange={handleBreakpointsChange}
            onLSPReady={handleLSPReady}
            activeLine={activeLine}
            error={error}
            setError={setError}
            isActive={activeMobileTab === "editor"}
          >
            <LowerPanel
              activePanel={activePanel}
              panels={[
                {
                  key: "instrumented",
                  label: "Instrumented",
                  render: () => (
                    <InstrumentedPanel
                      original={code}
                      modified={instrumentedCodePreview}
                    />
                  ),
                },
                {
                  key: "console",
                  label: "Console",
                  render: () => <ConsolePanel logs={consoleLogs} />,
                },
              ]}
            />
          </EditorPane>

          <VisualizerPane
            snapshot={currentSnapshot}
            logs={snapshotLogs}
            isActive={activeMobileTab === "visualizer"}
          />
        </div>
      )}

      <MobileTabs
        activeMobileTab={activeMobileTab}
        setActiveMobileTab={setActiveMobileTab}
      />

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
        onToggleInstrumented={() => togglePanel("instrumented")}
        showInstrumented={activePanel === "instrumented"}
        onToggleConsole={() => togglePanel("console")}
        showConsole={activePanel === "console"}
      />
    </div>
  );
};

export default App;
