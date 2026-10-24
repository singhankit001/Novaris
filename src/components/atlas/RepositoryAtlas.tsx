"use client";
import { Badge } from "@/components/nv/badge";
import { IndeterminateProgress } from "@/components/nv/skeleton";
import { AtlasList2D } from "./AtlasList2D";
import { AtlasView, useAtlasLayout } from "./AtlasView";
import { isFile } from "./build-atlas";
import type { AtlasEdge, AtlasIdentity, AtlasPhase, AtlasTreeEntry, MotionPreference } from "./types";

export interface RepositoryAtlasProps {
  tree: AtlasTreeEntry[];
  /** Collected relations only (files cited in an answer; imports only from a real analysis). */
  edges: AtlasEdge[];
  phase: AtlasPhase;
  identity: AtlasIdentity;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  motion?: MotionPreference;
}

const PHASE_TEXT: Record<AtlasPhase, string> = {
  idle: "Waiting for a repository.",
  acquiring: "Reading the repository file tree.",
  analyzing: "Analyzing files. Length unknown.",
  complete: "Analysis complete.",
  failed: "Stopped. Showing what was collected before the failure.",
};

/** Data-backed atlas. Every node is a file from `tree`; every edge carries evidence. Nothing is invented. */
export function RepositoryAtlas({ tree, edges, phase, identity, selectedPath, onSelect, motion }: RepositoryAtlasProps) {
  const layout = useAtlasLayout(tree, edges);
  const files = tree.filter(isFile).length;
  const busy = phase === "acquiring" || phase === "analyzing";
  return (
    <section data-atlas="repository" aria-label="Repository atlas" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono text-nv-body text-nv-ivory-50">{identity.owner}/{identity.repo}</h3>
        <Badge status="success">From repository data</Badge>
        <span className="nv-num text-nv-small text-nv-ivory-300">
          {files} files in {layout.totalLayers} top-level {layout.totalLayers === 1 ? "layer" : "layers"}
          {layout.hiddenFiles > 0 ? `, ${layout.hiddenFiles} not drawn in the visual (all listed below)` : ""}
        </span>
      </header>
      {busy ? <IndeterminateProgress label="Atlas progress" phase={PHASE_TEXT[phase]} /> : <p role="status" className="text-nv-small text-nv-ivory-300">{PHASE_TEXT[phase]}</p>}
      <AtlasView tree={tree} edges={edges} phase={phase} selectedPath={selectedPath} onSelect={onSelect} motion={motion} label={`Atlas of ${identity.owner}/${identity.repo}`} />
      <AtlasList2D tree={tree} edges={edges} selectedPath={selectedPath} onSelect={onSelect} showEvidence={phase === "complete"} />
    </section>
  );
}
