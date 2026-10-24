"use client";
import { Badge } from "@/components/nv/badge";
import { AtlasView } from "./AtlasView";
import type { AtlasEdge, AtlasTreeEntry, MotionPreference } from "./types";

const names: Record<string, number> = { app: 14, components: 18, lib: 10, tests: 8, docs: 5 };
const tree: AtlasTreeEntry[] = Object.entries(names).flatMap(([dir, n]) =>
  Array.from({ length: n }, (_, i) => ({ path: `${dir}/example-${String(i + 1).padStart(2, "0")}.ts`, type: "file" as const })),
);
const link = (a: string, b: string): AtlasEdge => ({ from: a, to: b, kind: "cited", evidence: { source: "Illustrative example, not repository data" } });
const edges: AtlasEdge[] = [
  link("app/example-01.ts", "lib/example-02.ts"),
  link("app/example-03.ts", "components/example-05.ts"),
  link("components/example-05.ts", "lib/example-07.ts"),
  link("tests/example-01.ts", "app/example-01.ts"),
];

/** Landing-page concept art. Fixed synthetic structure, labelled, never mistaken for analysis output. */
export function IllustrativeAtlas({ motion }: { motion?: MotionPreference }) {
  return (
    <figure data-atlas="illustrative" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge status="warning">Illustrative</Badge>
        <figcaption className="text-nv-small text-nv-ivory-200">
          Example structure to show the idea. Real results list your repository&apos;s own files, with each link tied to evidence.
        </figcaption>
      </div>
      <AtlasView tree={tree} edges={edges} phase="complete" motion={motion} label="Illustrative example of a repository atlas with five layers and four evidence links" />
    </figure>
  );
}
