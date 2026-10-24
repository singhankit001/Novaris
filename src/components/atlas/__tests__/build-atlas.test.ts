import { describe, expect, it } from "vitest";
import { buildAtlas, drawableEdges } from "../build-atlas";
import type { AtlasEdge, AtlasTreeEntry } from "../types";

const f = (path: string, size?: number): AtlasTreeEntry => ({ path, type: "blob", size });
const tree: AtlasTreeEntry[] = [
  { path: "src", type: "tree" },
  f("README.md"),
  f("src/a.ts", 10),
  f("src/b.ts"),
  f("src/c.ts"),
  f("lib/x.ts"),
  f("docs/y.md"),
  f("test/z.ts"),
];

describe("buildAtlas", () => {
  it("makes top-level dirs layers, biggest first, root files in (root)", () => {
    const a = buildAtlas(tree);
    expect(a.layers.map((l) => l.name)).toEqual(["src", "(root)", "docs", "lib", "test"]);
    expect(a.totalFiles).toBe(7);
    expect(a.hiddenFiles).toBe(0);
  });
  it("is deterministic regardless of input order", () => {
    expect(buildAtlas([...tree].reverse())).toEqual(buildAtlas(tree));
  });
  it("aggregates honestly past maxLayers and maxFilesPerLayer", () => {
    const a = buildAtlas(tree, { maxLayers: 2, maxFilesPerLayer: 2 });
    const agg = a.layers.at(-1)!;
    expect(agg.aggregate).toBe(true);
    expect(agg.name).toBe("+3 more directories");
    expect(agg.nodes).toHaveLength(0);
    expect(a.layers[0].hiddenCount).toBe(1);
    expect(a.hiddenFiles).toBe(1 + 3);
    expect(Object.keys(a.slots)).toHaveLength(3);
  });
  it("draws pinned (cited) files first and never invents nodes", () => {
    const a = buildAtlas(tree, { maxFilesPerLayer: 1, pinned: ["src/c.ts"] });
    expect(a.layers[0].nodes.map((n) => n.path)).toEqual(["src/c.ts"]);
    const paths = new Set(tree.map((t) => t.path));
    for (const l of a.layers) for (const n of l.nodes) expect(paths.has(n.path)).toBe(true);
  });
  it("drawableEdges drops edges with an undrawn endpoint", () => {
    const a = buildAtlas(tree, { maxFilesPerLayer: 1 });
    const e = (from: string, to: string): AtlasEdge => ({ from, to, kind: "cited", evidence: { source: "answer" } });
    expect(drawableEdges(a, [e("src/a.ts", "README.md"), e("src/a.ts", "src/c.ts"), e("src/a.ts", "nope.ts")])).toHaveLength(1);
  });
});
