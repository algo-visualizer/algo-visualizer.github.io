import React, { useEffect, useCallback } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import AppHeader from "./layout/AppHeader";
import AppDrawer from "./layout/AppDrawer";
import MobileTabs from "./layout/MobileTabs";
import EditorPane from "./layout/EditorPane/index";
import VisualizerPane from "./layout/VisualizerPane/index";
import Controls from "./layout/Controls";
import LowerPanel from "./layout/LowerPanel/index";
import { useVisualizationStore } from "./stores/useVisualizationStore";
import { useUIStore } from "./stores/useUIStore";
import { useCodeExecutor } from "./hooks/useCodeExecutor";
import Settings from "./layout/Settings";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";

const App: React.FC = () => {
  // Use Custom Hooks
  useCodeExecutor();
  useResponsiveLayout();

  // Stores
  const isVisualized = useVisualizationStore((state) => state.isVisualized);
  const isDesktop = useUIStore((state) => state.isDesktop);
  const activeMobileTab = useUIStore((state) => state.activeMobileTab);
  const setActiveMobileTab = useUIStore((state) => state.setActiveMobileTab);

  // Placeholder for future layout persistence
  const handleLayoutChange = useCallback((layout: Record<string, number>) => {
    // e.g., localStorage.setItem("panel-layout", JSON.stringify(layout));
    void layout;
  }, []);

  // Auto-switch to visualizer tab on mobile when visualized
  useEffect(() => {
    if (isVisualized && !isDesktop) {
      setActiveMobileTab("visualizer");
    }
  }, [isVisualized, isDesktop, setActiveMobileTab]);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100">
      <AppHeader />
      <Settings />

      <AppDrawer />

      {/* Main Content Area */}
      {isDesktop ? (
        <Group
          orientation="horizontal"
          className="flex-1 flex flex-col lg:flex-row overflow-hidden relative"
          defaultLayout={{ left: 50, right: 50 }}
          onLayoutChange={handleLayoutChange}
        >
          <Panel id="left" className="min-w-0 h-full">
            <EditorPane isActive>
              <LowerPanel />
            </EditorPane>
          </Panel>

          <Separator className="w-3 bg-zinc-900 hover:bg-zinc-800 transition-colors" />

          <Panel id="right" className="min-w-0 h-full">
            <VisualizerPane isActive />
          </Panel>
        </Group>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          <EditorPane isActive={activeMobileTab === "editor"}>
            <LowerPanel />
          </EditorPane>

          <VisualizerPane isActive={activeMobileTab === "visualizer"} />
        </div>
      )}

      <MobileTabs />

      {/* Footer Controls */}
      <Controls />
    </div>
  );
};

export default App;
