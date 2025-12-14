import { type ExecutionResult } from "../types";
import { instrumentCode } from "../utils/instrumentation"; // Still export this for App.tsx preview if needed, or re-export

// Re-export instrumentCode so App.tsx doesn't break if it imports it from here
export { instrumentCode };

let worker: Worker | null = null;

// Track the current running execution
let currentRunResolve: ((result: ExecutionResult) => void) | null = null;

export const loadPyodideService = async (
  pyodideReadyResolve: () => void,
): Promise<void> => {
  if (worker) return;

  worker = new Worker(
    new URL("../workers/pythonExecutionWorker.ts", import.meta.url),
    {
      type: "module",
    },
  );

  worker.addEventListener("message", (event: MessageEvent) => {
    const { type, snapshots, error } = event.data;

    if (type === "ready") {
      pyodideReadyResolve();
    }

    if (type === "result") {
      if (currentRunResolve) {
        currentRunResolve({
          snapshots: snapshots || [],
          error: error,
        });
        currentRunResolve = null;
      }
    }
  });

  worker.postMessage({ type: "init" });
};

export const runUserCode = async (
  code: string,
  breakpoints: Set<number>,
): Promise<ExecutionResult> => {
  if (!worker) {
    throw new Error("Pyodide worker not initialized");
  }

  return new Promise((resolve) => {
    // If there's an existing run, maybe we should cancel it?
    // For now, we'll just overwrite the resolver (effectively ignoring the previous result)
    currentRunResolve = resolve;

    worker!.postMessage({
      type: "run",
      code,
      breakpoints: Array.from(breakpoints), // Convert Set to Array for postMessage
    });
  });
};
