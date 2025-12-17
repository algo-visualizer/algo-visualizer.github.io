import type { GraphGroup } from "./layout/VisualizerPane/graphTypes";

export interface Snapshot {
  line: number;
  graph_group: GraphGroup;
  event: "line" | "call" | "return";
  stdout: string;
}

export interface ExecutionResult {
  snapshots: Snapshot[];
  error?: string;
}

export type BreakpointSet = Set<number>;

export interface LogEntry {
  type: "stdout";
  content: string;
  timestamp: number;
}
