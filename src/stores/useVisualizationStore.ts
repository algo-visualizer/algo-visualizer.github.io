import { create } from "zustand";
import { INITIAL_CODE_2 } from "../constants";
import { type Snapshot, type LogEntry, type ExecutionResult } from "../types";

interface VisualizationState {
  code: string;
  breakpoints: Set<number>;
  history: Snapshot[];
  currentStep: number;
  isExecuting: boolean;
  isVisualized: boolean;
  error: string | null;
  isCodeExecutorReady: boolean;

  consoleLogs: LogEntry[];
  runCode:
    | ((code: string, breakpoints: Set<number>) => Promise<ExecutionResult>)
    | null;

  // Actions
  setCode: (code: string) => void;
  setBreakpoints: (breakpoints: Set<number>) => void;
  toggleBreakpoint: (line: number) => void;
  setIsCodeExecutorReady: (ready: boolean) => void;

  setConsoleLogs: (
    logs: LogEntry[] | ((prev: LogEntry[]) => LogEntry[]),
  ) => void;
  addConsoleLog: (log: LogEntry) => void;
  setError: (error: string | null) => void;
  setRunCode: (
    runCode:
      | ((code: string, breakpoints: Set<number>) => Promise<ExecutionResult>)
      | null,
  ) => void;

  // Complex Actions
  runVisualization: () => Promise<boolean>;
  nextStep: () => void;
  prevStep: () => void;
  resetVisualization: () => void;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  code: INITIAL_CODE_2,
  breakpoints: new Set(),
  history: [],
  currentStep: -1,
  isExecuting: false,
  isVisualized: false,
  error: null,
  isCodeExecutorReady: false,

  consoleLogs: [],
  runCode: null,

  setCode: (code) => {
    set({ code, isVisualized: false });
  },

  setBreakpoints: (breakpoints) => {
    set({ breakpoints, isVisualized: false });
  },

  toggleBreakpoint: (line) => {
    set((state) => {
      const next = new Set(state.breakpoints);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return { breakpoints: next, isVisualized: false };
    });
  },

  setIsCodeExecutorReady: (isCodeExecutorReady) =>
    set({ isCodeExecutorReady: isCodeExecutorReady }),

  setConsoleLogs: (logs) =>
    set((state) => ({
      consoleLogs: typeof logs === "function" ? logs(state.consoleLogs) : logs,
    })),

  addConsoleLog: (log) =>
    set((state) => ({
      consoleLogs: [...state.consoleLogs, log],
    })),

  setError: (error) => set({ error }),

  resetVisualization: () => {
    set({
      isExecuting: false,
      error: null,
      history: [],
      consoleLogs: [],
      currentStep: -1,
    });
  },

  setRunCode: (runCode) => {
    set({ runCode: runCode });
  },

  runVisualization: async () => {
    const { isCodeExecutorReady, code, breakpoints, runCode } = get();
    if (!isCodeExecutorReady || !runCode) return false;

    set({
      isExecuting: true,
      error: null,
      history: [],
      consoleLogs: [],
      currentStep: -1,
    });

    try {
      const result = await runCode(code, breakpoints);

      if (result.error) {
        set({
          error: result.error,
          history: [],
          isExecuting: false,
        });
        return false;
      } else {
        const hasSnapshots = result.snapshots.length > 0;

        if (hasSnapshots) {
          set({
            history: result.snapshots,
            currentStep: 0,
            isVisualized: true,
            isExecuting: false,
          });
          return true;
        } else {
          // No snapshots
          const errorMsg =
            breakpoints.size > 0
              ? "Code executed but no breakpoints were hit."
              : "Add breakpoints (click the gutter) to visualize state.";

          set({
            error: errorMsg,
            isExecuting: false,
          });
          return false;
        }
      }
    } catch (err: any) {
      set({
        error: err.message || "An unexpected error occurred",
        isExecuting: false,
      });
      return false;
    }
  },

  nextStep: () => {
    set((state) => {
      if (state.currentStep < state.history.length - 1) {
        return { currentStep: state.currentStep + 1 };
      }
      return {};
    });
  },

  prevStep: () => {
    set((state) => {
      if (state.currentStep > 0) {
        return { currentStep: state.currentStep - 1 };
      }
      return {};
    });
  },
}));
