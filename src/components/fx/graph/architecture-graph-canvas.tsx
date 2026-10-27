"use client";

import "@xyflow/react/dist/style.css";
import {
  BaseEdge,
  Background,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import { AlertTriangle, Boxes, Cloud, FileCode2, Server } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { GraphList } from "./graph-list";
import { KIND_LABEL, type ArchKind, type ArchitectureGraphProps, type Severity } from "./graph-types";

interface NodeData extends Record<string, unknown> {
  label: string;
  kind: ArchKind;
  detail?: string;
  severity?: Severity;
  dim?: boolean;
}
interface EdgeData extends Record<string, unknown> {
  packet: boolean;
  hot: boolean;
  dim: boolean;
}

const ICON = { module: Boxes, file: FileCode2, service: Server, external: Cloud, finding: AlertTriangle };
const KIND_CLS: Record<ArchKind, string> = {
  module: "border-nv-copper-700 bg-white",
  file: "border-nv-graphite-600 bg-white",
  service: "border-nv-violet-400/40 bg-nv-violet-wash",
  external: "border-dashed border-nv-graphite-500 bg-nv-graphite-850",
  finding: "bg-white",
};
const SEV: Record<Severity, string> = {
  critical: "border-nv-danger-edge text-nv-danger",
  high: "border-nv-danger-edge text-nv-danger",
  medium: "border-nv-warning-edge text-nv-warning",
  low: "border-nv-info-edge text-nv-info",
};

function NovarisNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const Icon = ICON[data.kind];
  return (
    <div
      className={cn(
        "w-[11.5rem] rounded-nv-sm border px-3 py-2 font-nv-sans shadow-nv-card transition-opacity",
        data.dim && "opacity-40",
        KIND_CLS[data.kind],
        data.kind === "finding" && data.severity && SEV[data.severity],
        selected && "outline outline-2 outline-nv-copper-400",
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!size-1.5 !border-0 !bg-nv-graphite-500" />
      <div className="flex items-center gap-2 text-nv-ivory-100">
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate text-nv-small font-medium">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-nv-micro text-nv-graphite-400">
        <span>{KIND_LABEL[data.kind]}</span>
        {data.kind === "finding" && data.severity ? <span className="font-medium capitalize">{data.severity}</span> : null}
      </div>
      {data.detail ? <div className="mt-0.5 truncate font-nv-mono text-nv-micro text-nv-ivory-300">{data.detail}</div> : null}
      <Handle type="source" position={Position.Right} isConnectable={false} className="!size-1.5 !border-0 !bg-nv-graphite-500" />
    </div>
  );
}

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data }: EdgeProps<Edge<EdgeData>>) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: data?.hot ? "var(--nv-copper-400)" : "var(--nv-graphite-500)", strokeWidth: data?.hot ? 2.5 : 1.5, opacity: data?.dim ? 0.35 : 1 }}
      />
      {data?.packet ? (
        <circle r={3.5} fill="var(--nv-copper-400)">
          <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
      {label ? (
        <EdgeLabelRenderer>
          <span
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
            className="nodrag nopan pointer-events-none absolute rounded-nv-xs border border-nv-graphite-700 bg-white px-1.5 py-0.5 font-nv-mono text-nv-micro text-nv-ivory-300"
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes: NodeTypes = { module: NovarisNode, file: NovarisNode, service: NovarisNode, external: NovarisNode, finding: NovarisNode };
const edgeTypes: EdgeTypes = { flow: FlowEdge };

/** @xyflow/react canvas with Novaris node/edge types. Loaded on demand by ArchitectureGraph. */
export default function ArchitectureGraphCanvas({ nodes, edges, label, height = 420, controls = true, className, animate, selectedId, onSelect, highlightIds }: ArchitectureGraphProps & { animate: boolean }) {
  const lit = highlightIds ? new Set(highlightIds) : null;
  const rfNodes: Node<NodeData>[] = nodes.map((n) => ({
    id: n.id,
    type: n.kind,
    position: { x: n.x, y: n.y },
    selected: n.id === selectedId,
    data: { label: n.label, kind: n.kind, detail: n.detail, severity: n.severity, dim: !!lit && !lit.has(n.id) },
    ariaLabel: `${KIND_LABEL[n.kind]} ${n.label}${n.severity ? `, ${n.severity} severity` : ""}${n.detail ? `, ${n.detail}` : ""}`,
  }));
  const rfEdges: Edge<EdgeData>[] = edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    type: "flow",
    label: e.label,
    data: {
      packet: animate && (!lit ? !!e.animated : lit.has(e.from) && lit.has(e.to)),
      hot: !!lit && lit.has(e.from) && lit.has(e.to),
      dim: !!lit && !(lit.has(e.from) && lit.has(e.to)),
    },
  }));
  return (
    <div style={{ height }} role="group" aria-label={label} className={cn("overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-850", className)}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.6}
        onNodeClick={onSelect ? (_, node) => onSelect(node.id) : undefined}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1} color="#d9dce6" />
        {controls ? <Controls showInteractive={false} position="bottom-right" /> : null}
      </ReactFlow>
      <GraphList nodes={nodes} edges={edges} label={label} className="sr-only" />
    </div>
  );
}
