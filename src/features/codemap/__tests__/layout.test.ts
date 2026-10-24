import { describe, expect, it } from "vitest";
import { buildCodeGraph } from "../graph";
import { layoutGraph, type Filters } from "../layout";
import { createResolver } from "../resolve";
import type { ImportRef } from "../types";

const filters: Filters = { hiddenLangs: new Set(), hideExternal: false, hideTests: true, showNonSource: false };
const st = (spec: string): ImportRef => ({ spec, kind: "static" });

const tree = ["app/a.ts", "app/b.ts", "ui/x.ts", "ui/y.ts", "lib/z.ts", "app/a.test.ts"].map((path) => ({ path, type: "blob" as const }));
const parsed = new Map<string, ImportRef[]>([
  ["app/a.ts", [st("../ui/x"), st("../ui/y"), st("../lib/z"), st("react")]],
  ["app/b.ts", [st("../ui/x")]],
  ["ui/x.ts", [st("../lib/z")]],
  ["ui/y.ts", []],
  ["lib/z.ts", []],
]);
const graph = buildCodeGraph({ tree, parsed, resolve: createResolver(tree.map((t) => t.path)) });

describe("layoutGraph", () => {
  it("aggregates collapsed folders into weighted edges with in/out degree", () => {
    const r = layoutGraph(graph, new Set(), filters);
    const ids = r.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["dir:__external__", "dir:app", "dir:lib", "dir:ui"]);
    const appToUi = r.edges.find((e) => e.source === "dir:app" && e.target === "dir:ui");
    expect(appToUi?.count).toBe(3);
    expect(r.nodes.find((n) => n.id === "dir:ui")).toMatchObject({ inDeg: 3, outDeg: 1 });
    expect(r.nodeOf.get("app/a.ts")).toBe("dir:app");
  });

  it("hides tests, places importers left of imported files, and nests files in expanded frames", () => {
    const r = layoutGraph(graph, new Set(["app", "ui", "lib"]), filters);
    expect(r.nodes.some((n) => n.id === "app/a.test.ts")).toBe(false);
    const a = r.nodes.find((n) => n.id === "app/a.ts");
    expect(a?.parentId).toBe("dir:app");
    const app = r.nodes.find((n) => n.id === "dir:app");
    const lib = r.nodes.find((n) => n.id === "dir:lib");
    expect(app && lib && app.x < lib.x).toBe(true);
    expect(r.edges.find((e) => e.source === "app/a.ts" && e.target === "ui/x.ts")).toBeTruthy();
  });

  it("drops external nodes when hidden", () => {
    const r = layoutGraph(graph, new Set(), { ...filters, hideExternal: true });
    expect(r.nodes.some((n) => n.id === "dir:__external__")).toBe(false);
  });
});
