import React from "react";
import { type Monaco } from "../../layout/EditorPane/types";

export const registerSignatureHelpProvider = (
  monaco: Monaco,
  workerRef: React.RefObject<Worker | null>,
) => {
  return monaco.languages.registerSignatureHelpProvider("python", {
    signatureHelpTriggerCharacters: ["(", ","],
    provideSignatureHelp: (model: any, position: any) => {
      const worker = workerRef.current;
      if (!worker) return null;

      const code = model.getValue();
      const requestId = Math.random().toString(36).substring(7);

      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.id === requestId) {
            worker.removeEventListener("message", handler);
            const result = e.data.result;
            if (!result) {
              resolve(null);
              return;
            }
            resolve({
              value: result,
              dispose: () => {},
            });
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({
          id: requestId,
          type: "signature",
          code: code,
          line: position.lineNumber,
          column: position.column - 1,
        });
      });
    },
  });
};
