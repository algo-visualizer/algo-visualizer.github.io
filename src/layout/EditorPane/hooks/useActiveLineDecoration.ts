import { useRef, useEffect, type RefObject } from "react";
import { monaco, type Monaco, type MonacoEditor } from "../types";

/**
 * Hook to manage active line decoration (highlighting current execution line).
 *
 * Responsibilities:
 * - Apply/remove active line highlight decoration
 * - Scroll to reveal active line
 */
export function useActiveLineDecoration(
  editorRef: RefObject<MonacoEditor | null>,
  monacoRef: RefObject<Monaco | null>,
  activeLine: number | null,
) {
  const activeCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editorInstance = editorRef.current;
    const monacoInstance = monacoRef.current;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (activeLine !== null) {
      newDecorations.push({
        range: new monacoInstance.Range(activeLine, 1, activeLine, 1),
        options: {
          isWholeLine: true,
          className: "monaco-active-line",
        },
      });
      editorInstance.revealLineInCenter(activeLine);
    }

    if (!activeCollectionRef.current) {
      activeCollectionRef.current =
        editorInstance.createDecorationsCollection(newDecorations);
    } else {
      activeCollectionRef.current.set(newDecorations);
    }
  }, [activeLine]); // Removed editorRef, monacoRef - refs don't trigger updates

  // Cleanup active line decoration on unmount
  useEffect(() => {
    return () => {
      activeCollectionRef.current?.clear();
    };
  }, []);

  return { activeCollectionRef };
}
