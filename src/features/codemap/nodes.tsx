"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Folder, FolderOpen, Package } from "lucide-react";
import { LANG_COLOR, LANG_LABEL } from "./languages";
import type { LayoutNode, Side } from "./layout";
import s from "./codemap.module.css";

export interface MapNodeData extends Record<string, unknown> {
  node: LayoutNode;
  state: "idle" | "hot" | "dim" | "selected";
  match: boolean;
  inCycle: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

export type MapNode = Node<MapNodeData, "file" | "chip" | "frame">;

const SIDES: Array<[Side, Position]> = [
  ["t", Position.Top],
  ["r", Position.Right],
  ["b", Position.Bottom],
  ["l", Position.Left],
];

function Handles() {
  return (
    <>
      {SIDES.map(([side, pos]) => (
        <span key={side}>
          <Handle id={`s-${side}`} type="source" position={pos} className={s.handle} isConnectable={false} />
          <Handle id={`t-${side}`} type="target" position={pos} className={s.handle} isConnectable={false} />
        </span>
      ))}
    </>
  );
}

function Badges({ node }: { node: LayoutNode }) {
  return (
    <span className={s.badges}>
      <span className={s.badge} title={`${node.inDeg} imports coming in from other folders`}>
        <ArrowDownLeft aria-hidden size={11} />
        <span className="nv-num">{node.inDeg}</span>
        <span className={s.srOnly}>imported by</span>
      </span>
      <span className={s.badge} title={`${node.outDeg} imports going out to other folders`}>
        <ArrowUpRight aria-hidden size={11} />
        <span className="nv-num">{node.outDeg}</span>
        <span className={s.srOnly}>imports</span>
      </span>
    </span>
  );
}

export function FileNodeView({ data }: NodeProps<MapNode>) {
  const { node } = data;
  const ext = node.kind === "ext";
  return (
    <div className={s.nodeWrap} data-state={data.state} data-match={data.match || undefined}>
      <Handles />
      <button
        type="button"
        className={s.file}
        data-ext={ext || undefined}
        title={node.path}
        aria-pressed={data.state === "selected"}
        aria-label={`${ext ? "Package" : "File"} ${node.path}, ${LANG_LABEL[node.lang]}, imported by ${node.inDeg}, imports ${node.outDeg}`}
        onClick={() => data.onSelect(node.id)}
      >
        {ext ? <Package aria-hidden size={13} className={s.pkg} /> : <span className={s.dot} style={{ background: LANG_COLOR[node.lang] }} />}
        <span className={s.fileName}>{node.name}</span>
        {data.inCycle && <span className={s.cycleMark} title="Part of an import cycle" aria-label="in an import cycle" />}
      </button>
    </div>
  );
}

export function ChipNodeView({ data }: NodeProps<MapNode>) {
  const { node } = data;
  const isExt = node.lang === "external";
  return (
    <div className={s.nodeWrap} data-state={data.state} data-match={data.match || undefined}>
      <Handles />
      <button
        type="button"
        className={s.chip}
        data-ext={isExt || undefined}
        aria-expanded={false}
        aria-label={`Folder ${node.name}, ${node.count} ${isExt ? "packages" : "files"}. Expand`}
        onClick={() => data.onToggle(node.id)}
      >
        <span className={s.chipTop}>
          <Folder aria-hidden size={15} className={s.folderIcon} />
          <span className={s.chipName}>{node.name}</span>
          <ChevronRight aria-hidden size={14} className={s.chev} />
        </span>
        <span className={s.chipBottom}>
          <span className={s.count}>
            <span className="nv-num">{node.count}</span> {isExt ? "packages" : node.count === 1 ? "file" : "files"}
          </span>
          <Badges node={node} />
        </span>
      </button>
    </div>
  );
}

export function FrameNodeView({ data }: NodeProps<MapNode>) {
  const { node } = data;
  const isExt = node.lang === "external";
  return (
    <div className={s.frame} data-ext={isExt || undefined} data-state={data.state}>
      <Handles />
      <button
        type="button"
        className={s.frameHead}
        aria-expanded
        aria-label={`Folder ${node.name}, ${node.count} files. Collapse`}
        onClick={() => data.onToggle(node.id)}
      >
        <ChevronDown aria-hidden size={14} className={s.chev} />
        <FolderOpen aria-hidden size={15} className={s.folderIcon} />
        <span className={s.chipName}>{node.name}</span>
        <span className={s.count}>
          <span className="nv-num">{node.count}</span> {isExt ? "packages" : "files"}
        </span>
        <Badges node={node} />
      </button>
    </div>
  );
}

/** Declared at module scope so React Flow sees stable references. */
export const nodeTypes = { file: FileNodeView, chip: ChipNodeView, frame: FrameNodeView };
