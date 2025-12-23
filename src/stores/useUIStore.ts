import { create } from "zustand";
import { type PanelKey } from "../types";

interface UIState {
  activePanel: PanelKey;
  isMenuOpen: boolean;
  activeMobileTab: "editor" | "visualizer";
  isDesktop: boolean;

  // Actions
  setActivePanel: (panel: PanelKey) => void;
  togglePanel: (panel: PanelKey) => void;
  setIsMenuOpen: (isOpen: boolean) => void;
  setActiveMobileTab: (tab: "editor" | "visualizer") => void;
  setIsDesktop: (isDesktop: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: null,
  isMenuOpen: false,
  activeMobileTab: "editor",
  isDesktop: false,

  setActivePanel: (activePanel) => set({ activePanel }),

  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),

  setIsMenuOpen: (isMenuOpen) => set({ isMenuOpen }),

  setActiveMobileTab: (activeMobileTab) => set({ activeMobileTab }),

  setIsDesktop: (isDesktop) => set({ isDesktop }),
}));
