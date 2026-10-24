"use client";
import { useState, useSyncExternalStore } from "react";
import { Box, Rows3 } from "lucide-react";
import { Button } from "@/components/nv/button";
import { AtlasCanvas } from "./AtlasCanvas";
import { AtlasStrata } from "./AtlasStrata";
import { buildAtlas, citedPaths } from "./build-atlas";
import { useEffectiveReduced } from "./use-reduced";
import type { AtlasEdge, AtlasLayout, AtlasPhase, AtlasTreeEntry, MotionPreference } from "./types";

const noop = () => () => {};
const smallTouchQuery = "(pointer: coarse) and (max-width: 767px)";
function useSmallTouch(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(smallTouchQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(smallTouchQuery).matches,
    () => false,
  );
}

/** Layout recomputed only when the tree or edges identity changes (no useMemo in this codebase). */
export function useAtlasLayout(tree: AtlasTreeEntry[], edges: AtlasEdge[]): AtlasLayout {
  const [cache, setCache] = useState(() => ({ tree, edges, layout: buildAtlas(tree, { pinned: citedPaths(edges) }) }));
  if (cache.tree !== tree || cache.edges !== edges) {
    const next = { tree, edges, layout: buildAtlas(tree, { pinned: citedPaths(edges) }) };
    setCache(next);
    return next.layout;
  }
  return cache.layout;
}

export interface AtlasViewProps {
  tree: AtlasTreeEntry[];
  edges: AtlasEdge[];
  phase: AtlasPhase;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  motion?: MotionPreference;
  label: string;
}

/** Server-rendered SVG strata first; the WebGL scene replaces it after hydration when allowed. */
export function AtlasView({ tree, edges, phase, selectedPath, onSelect, motion, label }: AtlasViewProps) {
  const layout = useAtlasLayout(tree, edges);
  const reduced = useEffectiveReduced(motion);
  const smallTouch = useSmallTouch();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [pref, setPref] = useState<boolean | undefined>();
  const want3d = hydrated && !reduced && (pref ?? !smallTouch);
  const flat = <AtlasStrata layout={layout} edges={edges} citedVisible={phase === "complete"} selectedPath={selectedPath} label={`${label}. Flat layers view.`} />;
  return (
    <div className="flex flex-col gap-2">
      {want3d ? (
        <AtlasCanvas layout={layout} edges={edges} phase={phase} selectedPath={selectedPath} onSelect={onSelect} label={`${label}. 3D layers view. The file list holds the same data.`} fallback={flat} />
      ) : (
        flat
      )}
      {hydrated && !reduced && (
        <Button variant="ghost" className="self-start" leading={want3d ? <Rows3 aria-hidden className="size-4" /> : <Box aria-hidden className="size-4" />} aria-pressed={want3d} onClick={() => setPref(!want3d)}>
          {want3d ? "Use flat view" : "Use 3D view"}
        </Button>
      )}
    </div>
  );
}
