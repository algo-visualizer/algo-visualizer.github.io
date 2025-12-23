import { useRef, useEffect, useCallback, type RefObject } from "react";
import { monaco, type Monaco, type MonacoEditor } from "../types";

interface UseBreakpointsOptions {
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  onBreakpointsChange: (newBreakpoints: Set<number>) => void;
}

interface UseBreakpointsReturn {
  /** Decoration collection for breakpoints */
  decorationsCollectionRef: RefObject<monaco.editor.IEditorDecorationsCollection | null>;
  /** Ref to track current breakpoints in event handlers */
  breakpointsRef: RefObject<Set<number>>;
  /** Flag to prevent update loops during sync */
  isSyncingRef: RefObject<boolean>;
  /** Setup function to be called on editor mount */
  setupBreakpointHandlers: (editor: MonacoEditor, monaco: Monaco) => void;
}

/**
 * Hook to manage breakpoint state, decorations, and interactions.
 *
 * Responsibilities:
 * - Gutter click/drag interactions
 * - Preview decorations during drag
 * - Sticky breakpoints (tracking decorations when code changes)
 * - Sync React state <-> Monaco decorations
 */
export function useBreakpoints(
  editorRef: RefObject<MonacoEditor | null>,
  monacoRef: RefObject<Monaco | null>,
  { breakpoints, toggleBreakpoint, onBreakpointsChange }: UseBreakpointsOptions,
): UseBreakpointsReturn {
  // Decoration refs
  const bpCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const previewCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Sync refs
  const breakpointsRef = useRef<Set<number>>(breakpoints);
  const isSyncingRef = useRef(false);

  // Drag state refs
  const dragStartLineRef = useRef<number | null>(null);
  const dragCurrentLineRef = useRef<number | null>(null);
  const isDraggingRangeRef = useRef(false);

  // Keep breakpointsRef in sync
  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  // Sync React breakpoints -> Monaco decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || isSyncingRef.current)
      return;

    const editorInstance = editorRef.current;
    const monacoInstance = monacoRef.current;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    breakpoints.forEach((line) => {
      newDecorations.push({
        range: new monacoInstance.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "breakpoint-glyph",
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    if (!bpCollectionRef.current) {
      bpCollectionRef.current =
        editorInstance.createDecorationsCollection(newDecorations);
    } else {
      bpCollectionRef.current.set(newDecorations);
    }
  }, [breakpoints]); // Removed editorRef, monacoRef - refs don't trigger updates

  // Setup function to be called on editor mount
  const setupBreakpointHandlers = useCallback(
    (editorInstance: MonacoEditor, monacoInstance: Monaco) => {
      const clearPreview = () => {
        previewCollectionRef.current?.clear();
      };

      const updatePreview = (startLine: number, endLine: number) => {
        if (!editorRef.current) return;
        const editorInstance = editorRef.current;
        const [from, to] =
          startLine <= endLine ? [startLine, endLine] : [endLine, startLine];

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];
        for (let line = from; line <= to; line++) {
          decorations.push({
            range: new monacoInstance.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: "breakpoint-range-line",
              glyphMarginClassName: "breakpoint-range-glyph",
            },
          });
        }

        if (!previewCollectionRef.current) {
          previewCollectionRef.current =
            editorInstance.createDecorationsCollection(decorations);
        } else {
          previewCollectionRef.current.set(decorations);
        }
      };

      // Gutter mouse handlers
      editorInstance.onMouseDown((e: any) => {
        if (
          e.target.type ===
          monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
        ) {
          const line = e.target.position.lineNumber;
          dragStartLineRef.current = line;
          dragCurrentLineRef.current = line;
          isDraggingRangeRef.current = false;
        }
      });

      editorInstance.onMouseMove((e: any) => {
        if (
          dragStartLineRef.current !== null &&
          e.target.position &&
          e.target.type ===
            monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
        ) {
          const currentLine = e.target.position.lineNumber;
          dragCurrentLineRef.current = currentLine;
          if (currentLine !== dragStartLineRef.current) {
            isDraggingRangeRef.current = true;
          }
          updatePreview(dragStartLineRef.current, currentLine);
        }
      });

      editorInstance.onMouseUp((e: any) => {
        if (dragStartLineRef.current === null) return;

        const releaseLine =
          e.target?.position?.lineNumber ?? dragStartLineRef.current;
        const start = dragStartLineRef.current;
        const end = releaseLine;

        if (isDraggingRangeRef.current && start !== null && end !== null) {
          const [from, to] = start <= end ? [start, end] : [end, start];
          const latest = breakpointsRef.current;
          const newSet = new Set<number>(latest);
          for (let line = from; line <= to; line++) {
            if (newSet.has(line)) {
              newSet.delete(line);
            } else {
              newSet.add(line);
            }
          }
          onBreakpointsChange(newSet);
        } else {
          toggleBreakpoint(start);
        }

        clearPreview();
        dragStartLineRef.current = null;
        dragCurrentLineRef.current = null;
        isDraggingRangeRef.current = false;
      });

      editorInstance.onDidChangeModelContent(() => {
        if (!monacoInstance || !editorInstance) return;

        const model = editorInstance.getModel();
        if (!model) return;

        const ranges = bpCollectionRef.current?.getRanges() || [];
        const newBreakpointSet = new Set<number>();

        ranges.forEach((range) => {
          if (range && range.startLineNumber > 0) {
            newBreakpointSet.add(range.startLineNumber);
          }
        });

        const currentBreakpoints = breakpointsRef.current;
        let hasChanges = newBreakpointSet.size !== currentBreakpoints.size;
        if (!hasChanges) {
          for (const b of currentBreakpoints) {
            if (!newBreakpointSet.has(b)) {
              hasChanges = true;
              break;
            }
          }
        }

        if (hasChanges) {
          isSyncingRef.current = true;
          onBreakpointsChange(newBreakpointSet);
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 0);
        }
      });
    },
    [toggleBreakpoint, onBreakpointsChange], // Removed editorRef, monacoRef - refs don't trigger updates
  );

  // Cleanup preview decorations on unmount
  useEffect(() => {
    return () => {
      previewCollectionRef.current?.clear();
      bpCollectionRef.current?.clear();
    };
  }, []); // Removed editorRef - refs don't trigger updates, this is only for cleanup

  return {
    decorationsCollectionRef: bpCollectionRef,
    breakpointsRef,
    isSyncingRef,
    setupBreakpointHandlers,
  };
}
