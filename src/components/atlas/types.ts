/** Raw entry from a real repository file tree (GitHub git-tree shape accepted). */
export interface AtlasTreeEntry {
  path: string;
  type: "file" | "dir" | "blob" | "tree";
  /** Bytes, only when measured. */
  size?: number;
  language?: string;
}

export interface AtlasNode {
  id: string;
  path: string;
  kind: "dir" | "file";
  /** Path segment count: `src/a.ts` is depth 2. */
  depth: number;
  size?: number;
  language?: string;
}

/** Only collected relations. `imports` edges require a real analysis that provides them. */
export interface AtlasEdge {
  from: string;
  to: string;
  kind: "cited" | "imports";
  evidence: { source: string; detail?: string };
}

export type AtlasPhase = "idle" | "acquiring" | "analyzing" | "complete" | "failed";

export type MotionPreference = "system" | "reduced" | "full";

export interface AtlasIdentity {
  owner: string;
  repo: string;
}

export interface AtlasLayer {
  id: string;
  name: string;
  /** Files in this layer in the source tree. */
  fileCount: number;
  nodes: AtlasNode[];
  /** Files in this layer that are not drawn (cap). */
  hiddenCount: number;
  /** True for the "+N more directories" aggregate; it has no nodes. */
  aggregate?: boolean;
}

export interface AtlasLayout {
  layers: AtlasLayer[];
  totalFiles: number;
  totalLayers: number;
  /** Files not drawn: per-layer caps plus aggregated layers. */
  hiddenFiles: number;
  /** Grid slot per drawn node id: column and row inside its layer. */
  slots: Record<string, { layer: number; col: number; row: number }>;
  cols: number;
}
