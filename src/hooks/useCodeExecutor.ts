import { useEffect, useRef } from "react";
import {
  loadPyodideService,
  runUserCode as runPythonCode,
} from "../python/pythonCodeExecutor";
import { useVisualizationStore } from "../stores/useVisualizationStore";

export const useCodeExecutor = () => {
  const setConsoleLogs = useVisualizationStore((state) => state.setConsoleLogs);
  const addConsoleLog = useVisualizationStore((state) => state.addConsoleLog);
  const setError = useVisualizationStore((state) => state.setError);
  const setIsCodeExecutorReady = useVisualizationStore(
    (state) => state.setIsCodeExecutorReady,
  );
  const setRunCode = useVisualizationStore((state) => state.setRunCode);

  const runCodeRef = useRef(runPythonCode);
  const loadCodeExecutorRef = useRef(loadPyodideService);

  useEffect(() => {
    runCodeRef.current = runPythonCode;
  }, [runPythonCode]);

  useEffect(() => {
    loadCodeExecutorRef
      .current({
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
      })
      .catch((err) => {
        console.error("Failed to load Pyodide:", err);
        setError("Failed to load Python environment. Please refresh.");
      });
  }, [setIsCodeExecutorReady, setConsoleLogs, addConsoleLog, setError]);
};
