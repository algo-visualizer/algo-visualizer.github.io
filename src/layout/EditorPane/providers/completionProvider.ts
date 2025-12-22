import React from "react";
import { type Monaco } from "../types";

export const registerCompletionProvider = (
  monaco: Monaco,
  workerRef: React.RefObject<Worker | null>,
) => {
  return monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: ["."],
    provideCompletionItems: (model: any, position: any) => {
      const worker = workerRef.current;
      if (!worker) return { suggestions: [] } as any;

      const code = model.getValue();
      const requestId = Math.random().toString(36).substring(7);

      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.id === requestId) {
            worker.removeEventListener("message", handler);

            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = e.data.result.map((item: any) => {
              let kind = monaco.languages.CompletionItemKind.Text;
              switch (item.kind) {
                case "function":
                  kind = monaco.languages.CompletionItemKind.Function;
                  break;
                case "keyword":
                  kind = monaco.languages.CompletionItemKind.Keyword;
                  break;
                case "module":
                  kind = monaco.languages.CompletionItemKind.Module;
                  break;
                case "class":
                  kind = monaco.languages.CompletionItemKind.Class;
                  break;
                case "instance":
                  kind = monaco.languages.CompletionItemKind.Variable;
                  break;
                case "statement":
                  kind = monaco.languages.CompletionItemKind.Variable;
                  break;
                case "param":
                  kind = monaco.languages.CompletionItemKind.Variable;
                  break;
                default:
                  kind = monaco.languages.CompletionItemKind.Text;
              }

              return {
                label: item.label,
                kind: kind,
                detail: item.detail,
                insertText: item.insertText,
                range: range,
              } as any;
            });

            resolve({ suggestions });
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({
          id: requestId,
          type: "complete",
          code: code,
          line: position.lineNumber,
          column: position.column - 1,
        });
      });
    },
  });
};
