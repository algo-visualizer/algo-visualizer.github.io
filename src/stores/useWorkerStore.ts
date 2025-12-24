import { create } from "zustand";

interface WorkerState {
  /**
   * A key that, when changed, signals the Code Executor worker to reinitialize.
   */
  codeExecutorResetKey: number;

  /**
   * A key that, when changed, signals the LSP worker to reinitialize.
   */
  lspResetKey: number;

  /**
   * Resets only the Code Executor worker.
   */
  resetCodeExecutor: () => void;

  /**
   * Resets only the LSP worker.
   */
  resetLSP: () => void;

  /**
   * Resets all workers (Code Executor and LSP) simultaneously.
   * Call this when you need both workers to reinitialize with new packages.
   */
  resetAllWorkers: () => void;
}

export const useWorkerStore = create<WorkerState>((set) => ({
  codeExecutorResetKey: 0,
  lspResetKey: 0,

  resetCodeExecutor: () =>
    set((state) => ({ codeExecutorResetKey: state.codeExecutorResetKey + 1 })),

  resetLSP: () => set((state) => ({ lspResetKey: state.lspResetKey + 1 })),

  resetAllWorkers: () =>
    set((state) => ({
      codeExecutorResetKey: state.codeExecutorResetKey + 1,
      lspResetKey: state.lspResetKey + 1,
    })),
}));
