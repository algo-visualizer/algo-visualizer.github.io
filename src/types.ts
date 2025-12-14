export interface Pointer {
  name: string;
  index: number | string; // int or string (e.g., "head")
  notcaptured: boolean;
}

export interface VarGraph {
  type: "var";
  frameid: string;
  parent_frameid: string | null;
  notcaptured: boolean;
  content: string; // The value string
}

export interface ArrayGraphContent {
  value: string[];
  pointers: Pointer[];
}

export interface ArrayGraph {
  type: "array";
  frameid: string;
  parent_frameid: string | null;
  notcaptured: boolean;
  content: string | ArrayGraphContent; // Can be string if not captured or error? Schema says anyOf string or content object
}

export interface Array2DGraph {
  type: "array2d";
  frameid: string;
  parent_frameid: string | null;
  notcaptured: boolean;
  content: string | any; // Placeholder for now
}

export interface NodesGraphContentItem {
  value: string;
  nexts: [string, string][]; // [targetId, weight]
}

export interface NodesGraphContent {
  value: { [key: string]: NodesGraphContentItem };
  pointers: Pointer[];
}

export interface NodesGraph {
  type: "nodes";
  frameid: string;
  parent_frameid: string | null;
  notcaptured: boolean;
  content: string | NodesGraphContent;
}

export type GraphUnion = VarGraph | ArrayGraph | Array2DGraph | NodesGraph;

export interface GraphGroup {
  [key: string]: GraphUnion;
}

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
