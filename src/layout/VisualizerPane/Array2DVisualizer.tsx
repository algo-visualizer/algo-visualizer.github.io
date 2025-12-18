import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import {
  type Array2DGraph,
  type Array2DGraphContent,
  type Pointer,
} from "./graphTypes";

interface Array2DVisualizerProps {
  data: Array2DGraph;
  name: string;
}

const CELL_SIZE = 50;
const CELL_PADDING = 5;
const MARGIN_LEFT = 60; // Space for row pointers
const MARGIN_TOP = 60; // Space for col pointers
const START_X = 100;
const START_Y = 50; // Middle of the SVG

const Array2DVisualizer: React.FC<Array2DVisualizerProps> = ({
  data,
  name,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Extract content safely
  const content = useMemo((): Array2DGraphContent | null => {
    if (typeof data.content === "string") return null;
    return data.content as Array2DGraphContent;
  }, [data.content]);

  useEffect(() => {
    if (!svgRef.current || !content) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const values = content.value || [];
    // pointers in 2D is [Pointer, Pointer][]
    // But the schema definitions are sometimes messy in generated TS.
    // I'll assume it matches schema: array of arrays.
    const pointerPairs = (content.pointers || []) as unknown as Pointer[][];

    const rowCount = values.length;
    const colCount = rowCount > 0 ? (values[0]?.length ?? 0) : 0;

    const totalWidth =
      MARGIN_LEFT + colCount * (CELL_SIZE + CELL_PADDING) + START_X + 50;
    const totalHeight =
      MARGIN_TOP + rowCount * (CELL_SIZE + CELL_PADDING) + START_Y + 50;

    svg
      .attr("width", Math.max(totalWidth, 400))
      .attr("height", Math.max(totalHeight, 300));

    // Assign colors to pointer names
    const colorMap = new Map<string, string>();
    pointerPairs.forEach((pair) => {
      pair.forEach((p) => {
        if (!colorMap.has(p.name)) {
          colorMap.set(p.name, "#fbbf24");
        }
      });
    });

    // Define arrow markers (one for each color potentially, or just dynamic fill)
    // Actually simpler to just draw paths directly or use one marker and colorize the line?
    // Markers inherit stroke color if we set fill="context-stroke" or similar,
    // but browser support varies.
    // Safest is to define a marker for each color used.
    const defs = svg.append("defs");
    colorMap.forEach((color, name) => {
      // Create a safe ID from the name (remove spaces etc)
      const safeName = name.replace(/[^a-zA-Z0-9]/g, "");
      defs
        .append("marker")
        .attr("id", `arrow-${safeName}`)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 5)
        .attr("refY", 5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", color);
    });

    const gridGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${START_X + MARGIN_LEFT}, ${START_Y + MARGIN_TOP})`,
      );

    // Draw Grid Cells
    values.forEach((row, r) => {
      row.forEach((val, c) => {
        const x = c * (CELL_SIZE + CELL_PADDING);
        const y = r * (CELL_SIZE + CELL_PADDING);

        const g = gridGroup
          .append("g")
          .attr("transform", `translate(${x}, ${y})`);

        // Box
        g.append("rect")
          .attr("width", CELL_SIZE)
          .attr("height", CELL_SIZE)
          .attr("fill", "#27272a") // zinc-800
          .attr("stroke", "#3f3f46") // zinc-700
          .attr("rx", 4);

        // Value
        g.append("text")
          .attr("x", CELL_SIZE / 2)
          .attr("y", CELL_SIZE / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("fill", "#e4e4e7") // zinc-200
          .text(val);

        // Indices (only on top row and left column maybe? Or inside every cell?)
        // ArrayVisualizer puts index below.
        // For 2D, let's put Col index on top of first row, Row index on left of first col.
      });
    });

    // Draw Axis Indices
    // Col indices
    if (rowCount > 0) {
      for (let c = 0; c < colCount; c++) {
        const x =
          START_X +
          MARGIN_LEFT +
          c * (CELL_SIZE + CELL_PADDING) +
          CELL_SIZE / 2;
        const y = START_Y + MARGIN_TOP - 10;
        svg
          .append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("fill", "#71717a") // zinc-500
          .attr("font-size", "12px")
          .text(c);
      }
    }
    // Row indices
    for (let r = 0; r < rowCount; r++) {
      const x = START_X + MARGIN_LEFT - 10;
      const y =
        START_Y + MARGIN_TOP + r * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
      svg
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "#71717a") // zinc-500
        .attr("font-size", "12px")
        .text(r);
    }

    // Array Name
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("fill", "#a1a1aa") // zinc-400
      .attr("font-size", "14px")
      .attr("font-family", "monospace")
      .text(`${name}`);

    // Draw Pointers
    // Draw Pointers
    // Draw Pointers and Highlights

    // Group pointers by index
    const rowPointersByIndex = new Map<number, string[]>();
    const colPointersByIndex = new Map<number, string[]>();

    pointerPairs.forEach((pair) => {
      // pair[0] is row pointer, pair[1] is col pointer
      const rowPtr = pair[0];
      const colPtr = pair[1];

      // Guard against undefined pointers
      if (!rowPtr || !colPtr) return;

      // Validate indices
      const rIndex = Number(rowPtr.index);
      const cIndex = Number(colPtr.index);

      if (isNaN(rIndex) || isNaN(cIndex)) return;

      // Collect Row Pointer
      const isRowTopSentinel = rIndex === -1;
      const isRowBottomSentinel = rIndex === rowCount;
      const isRowValid =
        isRowTopSentinel ||
        isRowBottomSentinel ||
        (rIndex >= 0 && rIndex < rowCount);

      if (isRowValid) {
        if (!rowPointersByIndex.has(rIndex)) {
          rowPointersByIndex.set(rIndex, []);
        }
        // Prevent duplicate names for the same index (though unlikely in valid state)
        const list = rowPointersByIndex.get(rIndex)!;
        if (!list.includes(rowPtr.name)) {
          list.push(rowPtr.name);
        }
      }

      // Collect Col Pointer
      const isColLeftSentinel = cIndex === -1;
      const isColRightSentinel = cIndex === colCount;
      const isColValid =
        isColLeftSentinel ||
        isColRightSentinel ||
        (cIndex >= 0 && cIndex < colCount);

      if (isColValid) {
        if (!colPointersByIndex.has(cIndex)) {
          colPointersByIndex.set(cIndex, []);
        }
        const list = colPointersByIndex.get(cIndex)!;
        if (!list.includes(colPtr.name)) {
          list.push(colPtr.name);
        }
      }

      // Highlight Cell at (rIndex, cIndex)
      if (
        rIndex >= 0 &&
        rIndex < rowCount &&
        cIndex >= 0 &&
        cIndex < colCount
      ) {
        const rowColor = colorMap.get(rowPtr.name) || "#fbbf24";
        const cellSpan = CELL_SIZE + CELL_PADDING;
        const gridStartX = START_X + MARGIN_LEFT;
        const gridStartY = START_Y + MARGIN_TOP;

        const x = gridStartX + cIndex * cellSpan;
        const y = gridStartY + rIndex * cellSpan;

        // Frame color matches the row pointer (primary)
        const frameColor = rowColor;

        svg
          .append("rect")
          .attr("x", x)
          .attr("y", y)
          .attr("width", CELL_SIZE)
          .attr("height", CELL_SIZE)
          .attr("fill", "none")
          .attr("stroke", frameColor)
          .attr("stroke-width", 3)
          .attr("rx", 4);
      }
    });

    // Render Row Pointers
    rowPointersByIndex.forEach((names, rIndex) => {
      if (!names.length) return;
      // Pick color of the first pointer
      const primaryName = names[0] as string;
      const rowColor = colorMap.get(primaryName) || "#fbbf24";
      const safeRowName = primaryName.replace(/[^a-zA-Z0-9]/g, "");
      const cellSpan = CELL_SIZE + CELL_PADDING;
      const gridStartX = START_X + MARGIN_LEFT;
      const gridStartY = START_Y + MARGIN_TOP;

      const isRowTopSentinel = rIndex === -1;
      const isRowBottomSentinel = rIndex === rowCount;
      const isSentinel = isRowTopSentinel || isRowBottomSentinel;

      const rowX = gridStartX - 30; // Tip of arrow
      const rowY = isRowTopSentinel
        ? gridStartY - CELL_PADDING * 5
        : isRowBottomSentinel
          ? gridStartY + rowCount * cellSpan - CELL_PADDING * 5
          : gridStartY + rIndex * cellSpan + CELL_SIZE / 2;

      const group = svg
        .append("g")
        .attr("transform", `translate(${rowX}, ${rowY})`)
        .attr("opacity", isSentinel ? 0.3 : 1);

      group
        .append("line")
        .attr("x1", -25)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", rowColor)
        .attr("stroke-width", 2)
        .attr("marker-end", `url(#arrow-${safeRowName})`);

      group
        .append("text")
        .attr("x", -30)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", rowColor)
        .attr("font-weight", "bold")
        .text(names.join(", "));
    });

    // Render Col Pointers
    colPointersByIndex.forEach((names, cIndex) => {
      if (!names.length) return;
      // Pick color of the first pointer
      const primaryName = names[0] as string;
      const colColor = colorMap.get(primaryName) || "#fbbf24";
      const safeColName = primaryName.replace(/[^a-zA-Z0-9]/g, "");
      const cellSpan = CELL_SIZE + CELL_PADDING;
      const gridStartX = START_X + MARGIN_LEFT;
      const gridStartY = START_Y + MARGIN_TOP;

      const isColLeftSentinel = cIndex === -1;
      const isColRightSentinel = cIndex === colCount;
      const isSentinel = isColLeftSentinel || isColRightSentinel;

      const colY = gridStartY - 30; // Tip at margin-20
      const colX = isColLeftSentinel
        ? gridStartX - CELL_PADDING * 5
        : isColRightSentinel
          ? gridStartX + colCount * cellSpan - CELL_PADDING * 5
          : gridStartX + cIndex * cellSpan + CELL_SIZE / 2;

      const group = svg
        .append("g")
        .attr("transform", `translate(${colX}, ${colY})`)
        .attr("opacity", isSentinel ? 0.3 : 1);

      // Pointing DOWN
      group
        .append("line")
        .attr("x1", 0)
        .attr("y1", -25)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", colColor)
        .attr("stroke-width", 2)
        .attr("marker-end", `url(#arrow-${safeColName})`);

      group
        .append("text")
        .attr("x", 0)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("fill", colColor)
        .attr("font-weight", "bold")
        .text(names.join(", "));
    });
  }, [content, name]);

  if (!content) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-sm">
        {name}: (Not Captured)
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 overflow-x-auto">
      <svg ref={svgRef} className="block"></svg>
    </div>
  );
};

export default Array2DVisualizer;
