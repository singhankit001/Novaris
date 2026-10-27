"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useInView, useReducedMotion } from "framer-motion";
import { GraphList } from "./graph-list";
import type { ArchitectureGraphProps } from "./graph-types";

export type { ArchEdge, ArchNode, ArchitectureGraphProps } from "./graph-types";

/**
 * Interactive architecture map (@xyflow/react) with Novaris node kinds: module, file, service, external,
 * finding (severity = icon + text + colour). The canvas and its stylesheet load only once the graph scrolls
 * into view; until then (and on the server) a semantic list of nodes and connections renders in the same box.
 */
export function ArchitectureGraph(props: ArchitectureGraphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "200px" });
  const live = useInView(ref, { amount: 0.1 });
  const reduce = useReducedMotion();
  const height = props.height ?? 420;
  return (
    <div ref={ref} style={{ minHeight: height }} className={props.className}>
      {seen ? (
        <Canvas {...props} animate={live && !reduce} />
      ) : (
        <div style={{ height }} className="overflow-auto rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-850 p-3">
          <GraphList nodes={props.nodes} edges={props.edges} label={props.label} />
        </div>
      )}
    </div>
  );
}

const Canvas = dynamic(() => import("./architecture-graph-canvas"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full min-h-[inherit] animate-pulse rounded-nv-md bg-nv-graphite-850" />,
});
