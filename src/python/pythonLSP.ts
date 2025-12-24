import PythonLspWorker from "./workers/pythonLspWorker?worker";

let worker: Worker | null = null;

interface LoadLSPCallback {
  onLSPReady: () => void;
}

/**
 * Terminates the current LSP worker and resets the module state.
 * Call this before reinitializing with new packages.
 */
export const terminateWorker = (): void => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
};

/**
 * Returns the current LSP worker instance.
 * Used by LSP providers to send requests to the worker.
 */
export const getLSPWorker = (): Worker | null => {
  return worker;
};

/**
 * Initializes the LSP worker with the stored packages.
 * If a worker already exists, this is a no-op (use terminateLSPWorker first to reinitialize).
 */
export const loadLSPService = async ({
  onLSPReady,
}: LoadLSPCallback): Promise<void> => {
  // If worker already exists, skip (use terminateLSPWorker first to reinitialize)
  if (worker) return;

  worker = new PythonLspWorker();

  worker.addEventListener("message", (event: MessageEvent) => {
    if (event.data.type === "ready") {
      onLSPReady();
    }
  });

  // Send init message with packages
  const storedPackages = localStorage.getItem("pyodide_packages");
  const packages = storedPackages
    ? storedPackages.split("\n").filter((p) => p.trim() !== "")
    : [];
  worker.postMessage({ type: "init", packages });
};
