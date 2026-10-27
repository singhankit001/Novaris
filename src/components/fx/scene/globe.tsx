"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { cn } from "@/components/nv/cn";
import { GlobeFallback } from "./globe-fallback";
import { useInViewport } from "./shared";

/**
 * Globe: dotted three.js globe with illustrative arcs between fixed hub points. Intended only where
 * a global narrative is honest (open source is global). Arcs are illustrative: no user locations,
 * no counts. Props: className (size it with aspect-square + max-w), caption (accessible label).
 * The three.js chunk loads only once the box is near the viewport; GlobeFallback (static SVG, same
 * footprint) renders on the server, and when WebGL is unavailable.
 */
const GlobeCanvas = dynamic(() => import("./globe-canvas"), { ssr: false, loading: () => <GlobeFallback /> });

export function Globe({ className, caption = "Illustrative globe with example connection arcs" }: { className?: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInViewport(ref, "300px", true);
  return (
    <div ref={ref} role="img" aria-label={caption} className={cn("relative aspect-square w-full", className)}>
      {near ? <GlobeCanvas /> : <GlobeFallback />}
    </div>
  );
}
