import { create } from "zustand";

interface LSPState {
  isLSPReady: boolean;
  setIsLSPReady: (ready: boolean) => void;
}

export const useLSPStore = create<LSPState>((set) => ({
  isLSPReady: false,
  setIsLSPReady: (isLSPReady) => set({ isLSPReady }),
}));
