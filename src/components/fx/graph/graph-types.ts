export type ArchKind = "module" | "file" | "service" | "external" | "finding";
export type Severity = "critical" | "high" | "medium" | "low";

/** A node of the architecture graph. x/y are layout coordinates in px. */
export interface ArchNode {
  id: string;
  label: string;
  kind: ArchKind;
  x: number;
  y: number;
  /** Secondary line, e.g. a path or a one-line finding. */
  detail?: string;
  /** Required for kind "finding". */
  severity?: Severity;
}

export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Moving packet along the edge (paused off-screen, off with reduced motion). */
  animated?: boolean;
}

export interface ArchitectureGraphProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  /** Accessible name for the graph. */
  label: string;
  /** Rendered height in px (reserved before the canvas loads). */
  height?: number;
  /** Zoom/fit controls. */
  controls?: boolean;
  className?: string;
}

export const KIND_LABEL: Record<ArchKind, string> = {
  module: "Module",
  file: "File",
  service: "Service",
  external: "External",
  finding: "Finding",
};
