import { useRef, useEffect, useCallback, type RefObject } from "react";
import { type Monaco } from "../types";
import PythonLspWorker from "../../../python/workers/pythonLspWorker?worker";
import {
  registerCompletionProvider,
  registerHoverProvider,
  registerSignatureHelpProvider,
} from "../providers";

interface UseLSPWorkerOptions {
  onLSPReady: () => void;
}

interface UseLSPWorkerReturn {
  workerRef: RefObject<Worker | null>;
  /**
   * Registers all LSP providers (completion, hover, signature help) to the monaco instance.
   * Handles internal cleanup of existing providers if called multiple times.
   */
  registerProviders: (monaco: Monaco) => void;
}

/**
 * Hook to manage the LSP Worker lifecycle and provider registration.
 *
 * Responsibilities:
 * - Create and terminate the LSP worker
 * - Provide a function to register providers on a Monaco instance
 * - Automatically clean up providers on unmount
 */
export function useLSPWorker({
  onLSPReady,
}: UseLSPWorkerOptions): UseLSPWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  // Store onReady in a ref to avoid recreating worker when callback changes
  const onLSPReadyRef = useRef(onLSPReady);

  // Track registered providers for cleanup
  const providersRef = useRef<Array<{ dispose: () => void }>>([]);

  // Keep onReadyRef in sync
  useEffect(() => {
    onLSPReadyRef.current = onLSPReady;
  }, [onLSPReady]);

  // Create worker on mount
  useEffect(() => {
    const worker: Worker = new PythonLspWorker();
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "ready") {
        onLSPReadyRef.current();
      }
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;

      // Cleanup all registered providers
      providersRef.current.forEach((p) => p.dispose());
      providersRef.current = [];
    };
  }, []);

  /**
   * Register LSP providers to the given Monaco instance.
   */
  const registerProviders = useCallback((monaco: Monaco) => {
    if (!workerRef.current) {
      console.warn(
        "[LSP] Attempted to register providers before worker was ready.",
      );
      return;
    }

    // Cleanup existing providers if any (idempotency)
    providersRef.current.forEach((p) => p.dispose());

    // Register new ones and store them in the ref
    providersRef.current = [
      registerCompletionProvider(monaco, workerRef),
      registerHoverProvider(monaco, workerRef),
      registerSignatureHelpProvider(monaco, workerRef),
    ];
  }, []);

  return { workerRef, registerProviders };
}
