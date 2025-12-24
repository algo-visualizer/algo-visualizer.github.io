import { useEffect, useRef } from "react";
import {
  loadPyodideService,
  runUserCode as runPythonCode,
  terminateWorker,
} from "../python/pythonCodeExecutor";
import { useVisualizationStore } from "../stores/useVisualizationStore";
import { useWorkerStore } from "../stores/useWorkerStore";

export const useCodeExecutor = () => {
  const setConsoleLogs = useVisualizationStore((state) => state.setConsoleLogs);
  const addConsoleLog = useVisualizationStore((state) => state.addConsoleLog);
  const setError = useVisualizationStore((state) => state.setError);
  const setIsCodeExecutorReady = useVisualizationStore(
    (state) => state.setIsCodeExecutorReady,
  );
  const setRunCode = useVisualizationStore((state) => state.setRunCode);

  // Subscribe to code executor reset key
  const codeExecutorResetKey = useWorkerStore(
    (state) => state.codeExecutorResetKey,
  );

  const runCodeRef = useRef(runPythonCode);

  useEffect(() => {
    runCodeRef.current = runPythonCode;
  }, [runPythonCode]);

  // Initialize or reinitialize the worker when codeExecutorResetKey changes
  useEffect(() => {
    loadPyodideService({
      onPyodideReady: () => {
        setConsoleLogs([]);
        setRunCode(runCodeRef.current);
        setIsCodeExecutorReady(true);
      },
      batchedStdoutResolve: (output) => {
        addConsoleLog({
          type: "stdout",
          content: output,
          timestamp: Date.now(),
        });
      },
    }).catch((err) => {
      console.error("Failed to load Pyodide:", err);
      setError("Failed to load Python environment. Please refresh.");
    });

    return () => {
      console.log("Terminating code executor worker");
      terminateWorker();
      setIsCodeExecutorReady(false);
    };
  }, [codeExecutorResetKey]);
};
