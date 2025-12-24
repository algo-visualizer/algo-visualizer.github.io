import { useRef, useEffect, useCallback } from "react";
import { type Monaco } from "../types";
import {
  loadLSPService,
  terminateWorker,
  getLSPWorker,
} from "@/python/pythonLSP";
import {
  registerCompletionProvider,
  registerHoverProvider,
  registerSignatureHelpProvider,
} from "@/python/providers";
import { useWorkerStore } from "@/stores/useWorkerStore";
import { useLSPStore } from "@/stores/useLSPStore";

interface UseLSPWorkerOptions {
  onLSPReady: () => void;
}

interface UseLSPWorkerReturn {
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
 * - Initialize and terminate the LSP worker via pythonLSP module
 * - Provide a function to register providers on a Monaco instance
 * - Automatically clean up providers on unmount
 */
export function useLSP({
  onLSPReady,
}: UseLSPWorkerOptions): UseLSPWorkerReturn {
  // Store onReady in a ref to avoid recreating worker when callback changes
  const onLSPReadyRef = useRef(onLSPReady);

  // Track registered providers for cleanup
  const providersRef = useRef<Array<{ dispose: () => void }>>([]);

  // Subscribe to LSP reset key
  const lspResetKey = useWorkerStore((state) => state.lspResetKey);

  const setIsLSPReady = useLSPStore((state) => state.setIsLSPReady);

  // Keep onReadyRef in sync
  useEffect(() => {
    onLSPReadyRef.current = onLSPReady;
  }, [onLSPReady]);

  // Initialize or reinitialize the worker when lspResetKey changes
  useEffect(() => {
    loadLSPService({
      onLSPReady: () => {
        onLSPReadyRef.current();
        setIsLSPReady(true);
      },
    });

    return () => {
      console.log("Terminating LSP worker");
      terminateWorker();
      // Cleanup all registered providers on unmount
      providersRef.current.forEach((p) => p.dispose());
      providersRef.current = [];
      setIsLSPReady(false);
    };
  }, [lspResetKey]);

  /**
   * Register LSP providers to the given Monaco instance.
   */
  const registerProviders = useCallback((monaco: Monaco) => {
    const worker = getLSPWorker();
    if (!worker) {
      console.warn(
        "[LSP] Attempted to register providers before worker was ready.",
      );
      return;
    }

    // Cleanup existing providers if any (idempotency)
    providersRef.current.forEach((p) => p.dispose());

    // Register new ones and store them in the ref
    providersRef.current = [
      registerCompletionProvider(monaco, worker),
      registerHoverProvider(monaco, worker),
      registerSignatureHelpProvider(monaco, worker),
    ];
  }, []);

  return { registerProviders };
}
