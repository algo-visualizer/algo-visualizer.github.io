import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { NodesGraphContent } from "../types";

interface NodesVisualizerProps {
  data: NodesGraphContent;
  name: string;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  val: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  label: string;
}

const NodesVisualizer: React.FC<NodesVisualizerProps> = ({ data, name }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Persist simulation and graph state across renders
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 800;
    const height = 400;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");

    // Initialize render groups if they don't exist
    let linkGroup = svg.select<SVGGElement>(".link-group");
    if (linkGroup.empty()) {
      linkGroup = svg
        .append("g")
        .attr("class", "link-group")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);
    }

    let labelGroup = svg.select<SVGGElement>(".label-group");
    if (labelGroup.empty()) {
      labelGroup = svg.append("g").attr("class", "label-group");
    }

    let nodeGroup = svg.select<SVGGElement>(".node-group");
    if (nodeGroup.empty()) {
      nodeGroup = svg
        .append("g")
        .attr("class", "node-group")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
    }

    // Define marker if not exists
    if (svg.select("#arrow").empty()) {
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 28)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", "#999")
        .attr("d", "M0,-5L10,0L0,5");
    }

    // --- DATA PROCESSING (State Preservation) ---
    const currentNodes = nodesRef.current;

    // Map new data to nodes, reusing existing objects to preserve x,y
    const newNodes: Node[] = Object.entries(data.value).map(([id, item]) => {
      const existing = currentNodes.find((n) => n.id === id);
      if (existing) {
        // Update value but KEEP position (x, y, vx, vy)
        existing.val = item.value;
        return existing;
      }
      // New Node
      return {
        id,
        val: item.value,
        x: width / 2 + (Math.random() - 0.5) * 50,
        y: height / 2 + (Math.random() - 0.5) * 50, // Initial randomization near center
      };
    });

    // Detect if topology changed (nodes added/removed)
    const nodesChanged =
      newNodes.length !== currentNodes.length ||
      !newNodes.every((n) => currentNodes.find((c) => c.id === n.id));

    nodesRef.current = newNodes;

    // Process Links
    const newLinks: Link[] = [];
    Object.entries(data.value).forEach(([sourceId, item]) => {
      item.nexts.forEach(([targetId, weight]) => {
        // Verify target exists in NEW nodes set
        if (newNodes.find((n) => n.id === targetId)) {
          newLinks.push({
            source: sourceId, // D3 will map string ID to object ref
            target: targetId,
            label: weight,
          });
        }
      });
    });

    // Simple deep link comparison check (optional optimization)
    // For now, assume links changed if strictly different objects or counts
    // But since we create new objects every time, we rely on D3 to handle layout
    const linksChanged = newLinks.length !== linksRef.current.length; // Crude check

    linksRef.current = newLinks;

    // --- SIMULATION INIT / UPDATE ---
    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<Node, Link>(newNodes)
        .force(
          "link",
          d3
            .forceLink<Node, Link>(newLinks)
            .id((d) => d.id)
            .distance(100),
        )
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(30))
        .on("tick", ticked);
    } else {
      const sim = simulationRef.current;
      sim.nodes(newNodes);
      (sim.force("link") as d3.ForceLink<Node, Link>).links(newLinks);

      // Only restart with energy if topology changed dramatically
      // If just value update, do NOT restart alpha (keep it 0 or low)
      if (nodesChanged || linksChanged) {
        sim.alpha(0.1).restart();
      } else {
        // Just tick to update text/visuals if needed, or let existing alpha decay
        sim.alpha(0.01).restart(); // Minimal restart
      }
    }

    const simulation = simulationRef.current!;

    // --- VISUALIZATION (D3 Join) ---

    // 1. Links
    const link = linkGroup
      .selectAll<SVGLineElement, Link>("line")
      .data(newLinks, (d) => {
        const sid =
          typeof d.source === "object" ? (d.source as any).id : d.source;
        const tid =
          typeof d.target === "object" ? (d.target as any).id : d.target;
        return sid + "-" + tid;
      });

    const linkEnter = link
      .enter()
      .append("line")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    const linkUpdate = linkEnter.merge(link);
    link.exit().remove();

    // 2. Link Labels
    const linkLabel = labelGroup
      .selectAll<SVGTextElement, Link>("text")
      .data(newLinks, (d) => {
        const sid =
          typeof d.source === "object" ? (d.source as any).id : d.source;
        const tid =
          typeof d.target === "object" ? (d.target as any).id : d.target;
        return sid + "-" + tid;
      });

    const linkLabelEnter = linkLabel
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", 20)
      .attr("fill", "#626262ff");

    // Always update text
    const linkLabelUpdate = linkLabelEnter
      .merge(linkLabel)
      .text((d) => d.label);

    linkLabel.exit().remove();

    // 3. Nodes
    const node = nodeGroup
      .selectAll<SVGGElement, Node>("g.node")
      .data(newNodes, (d) => d.id);

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any,
      );

    nodeEnter
      .append("circle")
      .attr("r", 20)
      .attr("fill", "black")
      .attr("stroke", "#333")
      .attr("stroke-width", 2);

    nodeEnter
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("fill", "white")
      .attr("font-size", 24)
      .attr("font-weight", "bold")
      .attr("stroke", "none");

    const nodeUpdate = nodeEnter.merge(node);

    // Update Value Text
    nodeUpdate.select("text").text((d) => d.id);

    // Update Highlights (Pointer rings/text)
    // Clear previous generic highlights first? No, we need to completely redraw highlights or update them.
    // Easiest is to remove distinct pointer elements and re-add them,
    // OR manage them as separate selection.

    // Let's manage pointers as a separate selection over the nodes for cleanliness
    // Or just mutate the node circles directly here.

    // Reset all circles first
    nodeUpdate.select("circle").attr("stroke", "#333").attr("stroke-width", 2);

    // Remove old pointer labels
    nodeUpdate.selectAll(".pointer-label").remove();

    // Re-apply pointers
    const pointersByTarget: { [key: string]: string[] } = {};
    if (data.pointers) {
      data.pointers.forEach((p) => {
        if (typeof p.index === "string" && !p.notcaptured) {
          if (!pointersByTarget[p.index]) {
            pointersByTarget[p.index] = [];
          }
          pointersByTarget[p.index]!.push(p.name);
        }
      });
    }

    Object.entries(pointersByTarget).forEach(([targetId, names]) => {
      // Highlight Circle
      nodeUpdate
        .filter((d) => d.id === targetId)
        .select("circle")
        .attr("stroke", "#ff5722")
        .attr("stroke-width", 4);

      // Add Label
      nodeUpdate
        .filter((d) => d.id === targetId)
        .append("text")
        .attr("class", "pointer-label")
        .attr("x", 25)
        .attr("y", -10)
        .attr("text-anchor", "start")
        .attr("fill", "#ff5722")
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("stroke", "none")
        .text(names.join(", "));
    });

    node.exit().remove();

    // --- TICK FUNCTION ---
    function ticked() {
      linkUpdate
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      linkLabelUpdate
        .attr("x", (d) => ((d.source as Node).x! + (d.target as Node).x!) / 2)
        .attr("y", (d) => ((d.source as Node).y! + (d.target as Node).y!) / 2);

      nodeUpdate.attr("transform", (d) => `translate(${d.x},${d.y})`);
    }

    // Re-bind tick handler to closures of current selection
    // Note: simulation is mutable, but the ticked function closes over the specific selection variables.
    // If we recreate selections (Enter/Update), we might need to update the ticked closure OR
    // use a ref for the selection in the tick function.
    // Better way: defined ticked outside or update it inside effect.
    simulation.on("tick", ticked);

    // Initial Tick (optional, to snap positions if alpha is 0)
    // if (simulation.alpha() < 0.05) ticked();

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup? No, we persist simulation.
    // Usually we stop simulation on unmount.
    // return () => simulation.stop();
    // But we are in useEffect [data]. If we unmount, we should stop.
    // We only want to run THIS logic when data changes.
    // But simulation instance is refs.
  }, [data]); // Effect runs on data update

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (simulationRef.current) simulationRef.current.stop();
    };
  }, []);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 overflow-x-auto">
      <div className="text-zinc-400 text-sm font-medium mb-1">{name}</div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default NodesVisualizer;
