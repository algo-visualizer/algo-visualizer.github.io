import React from "react";
import { type Monaco } from "../../layout/EditorPane/types";

export const registerHoverProvider = (
  monaco: Monaco,
  workerRef: React.RefObject<Worker | null>,
) => {
  return monaco.languages.registerHoverProvider("python", {
    provideHover: (model: any, position: any) => {
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

            // Handle both single object (legacy) and array of objects
            const items = Array.isArray(result) ? result : [result];
            const contents = [];

            for (const item of items) {
              if (!item) continue;

              // 1. Code Signature
              if (item.code) {
                contents.push({
                  value: "```python\n" + item.code + "\n```",
                });
              }

              // 2. Docstring
              if (item.docstring) {
                contents.push({ value: item.docstring });
              }
            }

            resolve({
              contents: contents,
            });
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({
          id: requestId,
          type: "hover",
          code: code,
          line: position.lineNumber,
          column: position.column - 1,
        });
      });
    },
  });
};
