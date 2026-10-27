import { describe, expect, it } from "vitest";
import { ancestorsOf, buildTree, filterTree, flattenTree, summarizeTopLevel, typeAheadIndex, visibleWindow } from "./repo-tree";

const files = [
    { path: "src", type: "tree" as const },
    { path: "src/app/page.tsx", type: "blob" as const },
    { path: "src/lib/a.ts", type: "blob" as const },
    { path: "src/lib/b.ts", type: "blob" as const },
    { path: "README.md", type: "blob" as const },
    { path: "docs/guide.md", type: "blob" as const },
];

describe("repo tree", () => {
    const tree = buildTree(files);

    it("sorts folders first and counts files per folder", () => {
        expect(tree.map((n) => n.name)).toEqual(["docs", "src", "README.md"]);
        expect(tree.find((n) => n.name === "src")?.fileCount).toBe(3);
        expect(summarizeTopLevel(tree)).toEqual({ directories: [{ name: "src", fileCount: 3 }, { name: "docs", fileCount: 1 }], rootFiles: 1 });
    });

    it("flattens only open folders with aria positions", () => {
        const rows = flattenTree(tree, new Set(["src"]), null);
        expect(rows.map((r) => r.node.path)).toEqual(["docs", "src", "src/app", "src/lib", "README.md"]);
        expect(rows[2]).toMatchObject({ depth: 1, posInSet: 1, setSize: 2, parentPath: "src" });
    });

    it("filters to matches and opens their ancestors", () => {
        const f = filterTree(tree, "b.ts");
        expect(f?.matches).toBe(1);
        const rows = flattenTree(tree, f!.open, f!.visible);
        expect(rows.map((r) => r.node.path)).toEqual(["src", "src/lib", "src/lib/b.ts"]);
        expect(filterTree(tree, "  ")).toBeNull();
    });

    it("type-ahead wraps and windowing stays bounded for 5000+ rows", () => {
        const rows = flattenTree(tree, new Set(["src"]), null);
        expect(typeAheadIndex(rows, 0, "r")).toBe(4);
        expect(typeAheadIndex(rows, 4, "d")).toBe(0);
        const big = buildTree(Array.from({ length: 6000 }, (_, i) => ({ path: `f${i}.ts`, type: "blob" as const })));
        const w = visibleWindow(flattenTree(big, new Set(), null).length, 44, 44 * 3000, 600);
        expect(w.end - w.start).toBeLessThan(40);
        expect(ancestorsOf("a/b/c.ts")).toEqual(["a", "a/b"]);
    });
});
