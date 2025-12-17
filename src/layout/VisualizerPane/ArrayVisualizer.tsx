import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { type ArrayGraph, type ArrayGraphContent } from "../../types";

interface ArrayVisualizerProps {
  data: ArrayGraph;
  name: string;
}

const CELL_SIZE = 50;
const CELL_PADDING = 5;
const HEIGHT = 150;

const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ data, name }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Extract content safely
  const content = useMemo((): ArrayGraphContent | null => {
    if (typeof data.content === "string") return null;
    return data.content as ArrayGraphContent;
  }, [data.content]);

  useEffect(() => {
    if (!svgRef.current || !content) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const values = content.value || [];
    const pointers = content.pointers || [];

    /* const totalWidth =
      values.length * (CELL_SIZE + CELL_PADDING) + CELL_PADDING; */
    svg
      //.attr("width", Math.max(totalWidth, 200)) // Min width
      .attr("width", 800)
      .attr("height", HEIGHT);

    // Define arrow marker
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 5)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#fbbf24"); // Amber-400

    const startX = 20;
    const startY = 75; // Middle of the SVG

    // Render Array Cells
    const group = svg
      .append("g")
      .attr("transform", `translate(${startX}, ${startY})`);

    // Array Name
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("fill", "#a1a1aa") // zinc-400
      .attr("font-size", "14px")
      .attr("font-family", "monospace")
      .text(`${name}: [${values.join(", ")}]`);

    // Cells
    values.forEach((val, i) => {
      const x = i * (CELL_SIZE + CELL_PADDING);

      const g = group.append("g").attr("transform", `translate(${x}, 0)`);

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

      // Index
      g.append("text")
        .attr("x", CELL_SIZE / 2)
        .attr("y", CELL_SIZE + 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#71717a") // zinc-500
        .attr("font-size", "10px")
        .text(i);
    });

    // Pointers
    pointers.forEach((ptr) => {
      if (typeof ptr.index !== "number") return; // Skip complex indices for now

      const i = ptr.index;
      const isLeftSentinel = i === -1;
      const isRightSentinel = i === values.length;

      // Allow sentinel pointers at -1 and n (right-open interval), otherwise enforce bounds
      if (!isLeftSentinel && !isRightSentinel && (i < 0 || i >= values.length))
        return;

      const cellSpan = CELL_SIZE + CELL_PADDING;
      const x = isLeftSentinel
        ? startX - CELL_PADDING
        : isRightSentinel
          ? startX + values.length * cellSpan - CELL_PADDING
          : startX + i * cellSpan + CELL_SIZE / 2;
      const targetY = startY; // Top of the cell box

      // Pointers from Top
      const ptrG = svg
        .append("g")
        .attr("transform", `translate(${x}, ${targetY - 5})`);

      // Arrow line
      ptrG
        .append("line")
        .attr("x1", 0)
        .attr("y1", -20)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", "#fbbf24") // Amber-400
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrow)");

      // Label
      ptrG
        .append("text")
        .attr("x", 0)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#fbbf24") // Amber-400
        .attr("font-weight", "bold")
        .text(ptr.name);
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

export default ArrayVisualizer;
