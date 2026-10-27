import { describe, expect, it } from "vitest";
import { computeStats, buildCodeGraph, findCycles } from "../graph";
import { extractImports, parseFileBlocks } from "../parsers";
import { createResolver, parseGoModule, parseTsconfig } from "../resolve";
import { isTestPath, selectSourceFiles, toCodeFile } from "../languages";
import type { ImportRef } from "../types";

const specs = (path: string, src: string) => extractImports(path, src).map((r) => r.spec);

describe("extractImports", () => {
  it("reads every JS/TS import form and ignores comments", () => {
    const src = `
      import a from "./a";
      import type { T } from './types'
      import * as ns from "lodash/fp";
      import "./side-effect";
      export * from "./barrel";
      export { x } from "../up";
      const m = await import("./lazy");
      const r = require('./cjs');
      // import nope from "./commented"
      /* import nope2 from "./block" */
    `;
    expect(specs("src/x.ts", src).sort()).toEqual(
      ["./a", "./types", "lodash/fp", "./side-effect", "./barrel", "../up", "./lazy", "./cjs"].sort(),
    );
  });

  it("reads Python absolute and relative imports", () => {
    const src = "import os, sys\nfrom . import helpers, utils as u\nfrom .core import App\nfrom pkg.sub import thing\n";
    expect(specs("pkg/main.py", src)).toEqual(["os", "sys", ".helpers", ".utils", ".core", "pkg.sub"]);
  });

  it("reads Go single and block imports", () => {
    const src = 'package main\nimport "fmt"\nimport (\n  "net/http"\n  gin "github.com/gin-gonic/gin/render"\n)\n';
    expect(specs("main.go", src)).toEqual(["net/http", "github.com/gin-gonic/gin/render", "fmt"]);
  });

  it("reads Rust, Java, Ruby, PHP and C#", () => {
    expect(specs("src/lib.rs", "use crate::util::math;\nuse serde::Serialize;\npub mod net;\n")).toEqual([
      "crate::util::math",
      "serde",
      "net",
    ]);
    expect(specs("A.java", "import com.acme.Foo;\nimport static com.acme.Util.helper;\n")).toEqual([
      "com.acme.Foo",
      "com.acme.Util.helper",
    ]);
    expect(specs("a.rb", "require_relative 'b'\nrequire 'json'\n")).toEqual(["b", "json"]);
    expect(specs("a.php", "<?php\nuse App\\Models\\User;\nrequire_once __DIR__ . '/x.php';\n")).toEqual([
      "App\\Models\\User",
      "/x.php",
    ]);
    expect(specs("A.cs", "using System.Linq;\nusing Acme.Core;\n")).toEqual(["System.Linq", "Acme.Core"]);
  });

  it("reads only the script block of a Vue file", () => {
    const src = "<template><div/></template>\n<script setup lang=\"ts\">\nimport Foo from './Foo.vue'\n</script>";
    expect(specs("A.vue", src)).toEqual(["./Foo.vue"]);
  });
});

describe("parseFileBlocks", () => {
  it("splits the fetchRepoFiles context and drops truncation notes", () => {
    const ctx = "\n--- FILE: a.ts ---\nimport x from './b'\n\n--- FILE: b.ts ---\nexport const x = 1\n\n--- NOTE: Context truncated at 200,000 token limit ---\n";
    const blocks = parseFileBlocks(ctx);
    expect([...blocks.keys()]).toEqual(["a.ts", "b.ts"]);
    expect(blocks.get("a.ts")).toContain("import x");
    expect(blocks.get("b.ts")).not.toContain("NOTE");
  });
});

const js = (spec: string): ImportRef => ({ spec, kind: "static" });

describe("resolver: JS/TS", () => {
  const paths = [
    "src/app.ts",
    "src/lib/util.ts",
    "src/lib/index.ts",
    "src/components/Button.tsx",
    "src/esm.ts",
    "pkg/a/src/x.ts",
    "pkg/a/src/shared/y.ts",
  ];
  const aliases = [{ dir: "pkg/a", baseUrl: ".", paths: { "@shared/*": ["src/shared/*"] } }];
  const r = createResolver(paths, { aliases });

  it("resolves relative, extension, index and ESM-style .js specifiers", () => {
    expect(r("src/app.ts", js("./lib/util"))).toEqual({ kind: "file", path: "src/lib/util.ts" });
    expect(r("src/app.ts", js("./lib"))).toEqual({ kind: "file", path: "src/lib/index.ts" });
    expect(r("src/app.ts", js("./esm.js"))).toEqual({ kind: "file", path: "src/esm.ts" });
    expect(r("src/lib/util.ts", js("../components/Button"))).toEqual({ kind: "file", path: "src/components/Button.tsx" });
  });

  it("resolves @/ heuristics and tsconfig paths", () => {
    expect(r("src/app.ts", js("@/components/Button"))).toEqual({ kind: "file", path: "src/components/Button.tsx" });
    expect(r("pkg/a/src/x.ts", js("@shared/y"))).toEqual({ kind: "file", path: "pkg/a/src/shared/y.ts" });
  });

  it("classifies packages as external and drops unresolved relatives", () => {
    expect(r("src/app.ts", js("react"))).toEqual({ kind: "external", name: "react" });
    expect(r("src/app.ts", js("@scope/pkg/deep"))).toEqual({ kind: "external", name: "@scope/pkg" });
    expect(r("src/app.ts", js("./missing"))).toEqual({ kind: "skip" });
    expect(r("src/app.ts", js("../../../escape"))).toEqual({ kind: "skip" });
  });

  it("parses tsconfig with comments and trailing commas", () => {
    const a = parseTsconfig('{ // c\n "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"], }, }, }', "");
    expect(a?.paths?.["@/*"]).toEqual(["./src/*"]);
    expect(parseTsconfig("not json", "")).toBeNull();
  });
});

describe("resolver: Python, Go, Rust, Java", () => {
  it("resolves Python packages, relatives and symbol imports", () => {
    const r = createResolver(["pkg/__init__.py", "pkg/core.py", "pkg/helpers.py", "pkg/sub/__init__.py", "app.py"]);
    expect(r("pkg/core.py", { spec: ".helpers", kind: "static" })).toEqual({ kind: "file", path: "pkg/helpers.py" });
    expect(r("app.py", { spec: "pkg.core", kind: "static" })).toEqual({ kind: "file", path: "pkg/core.py" });
    expect(r("app.py", { spec: "pkg.core.Thing", kind: "static" })).toEqual({ kind: "file", path: "pkg/core.py" });
    expect(r("app.py", { spec: "pkg.sub", kind: "static" })).toEqual({ kind: "file", path: "pkg/sub/__init__.py" });
    expect(r("app.py", { spec: "requests", kind: "static" })).toEqual({ kind: "external", name: "requests" });
  });

  it("resolves Go module imports to a package representative", () => {
    expect(parseGoModule("module github.com/acme/app\n\ngo 1.22\n")).toBe("github.com/acme/app");
    const r = createResolver(["main.go", "render/render.go", "render/json.go", "render/json_test.go"], {
      goModule: "github.com/acme/app",
    });
    expect(r("main.go", { spec: "github.com/acme/app/render", kind: "static" })).toEqual({ kind: "file", path: "render/render.go" });
    expect(r("main.go", { spec: "net/http", kind: "static" })).toEqual({ kind: "external", name: "net" });
    expect(r("main.go", { spec: "github.com/other/lib/x", kind: "static" })).toEqual({
      kind: "external",
      name: "github.com/other/lib",
    });
  });

  it("resolves Rust crate paths and mod declarations", () => {
    const r = createResolver(["src/lib.rs", "src/util/mod.rs", "src/util/math.rs", "src/net.rs"]);
    expect(r("src/lib.rs", { spec: "crate::util::math", kind: "static" })).toEqual({ kind: "file", path: "src/util/math.rs" });
    expect(r("src/lib.rs", { spec: "net", kind: "mod" })).toEqual({ kind: "file", path: "src/net.rs" });
    expect(r("src/lib.rs", { spec: "serde", kind: "static" })).toEqual({ kind: "external", name: "serde" });
  });

  it("resolves Java imports by package path suffix", () => {
    const r = createResolver(["src/main/java/com/acme/Foo.java", "src/main/java/com/acme/Bar.java"]);
    expect(r("src/main/java/com/acme/Bar.java", { spec: "com.acme.Foo", kind: "static" })).toEqual({
      kind: "file",
      path: "src/main/java/com/acme/Foo.java",
    });
    expect(r("src/main/java/com/acme/Bar.java", { spec: "java.util.List", kind: "static" })).toEqual({
      kind: "external",
      name: "java.util",
    });
  });
});

describe("buildCodeGraph", () => {
  const tree = [
    "src/a.ts",
    "src/b.ts",
    "src/c.ts",
    "lib/d.ts",
    "README.md",
    "src/ui/Button.tsx",
  ].map((path) => ({ path, type: "blob" as const }));
  const parsed = new Map<string, ImportRef[]>([
    ["src/a.ts", [js("./b"), js("react"), js("../lib/d")]],
    ["src/b.ts", [js("./c"), js("react")]],
    ["src/c.ts", [js("./a"), js("./a")]],
    ["lib/d.ts", []],
  ]);
  const resolver = createResolver(tree.map((t) => t.path));
  const graph = buildCodeGraph({ tree, parsed, resolve: resolver });

  it("builds containment, deduplicated edges and externals", () => {
    expect(graph.folders.get("src")?.files).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(graph.folders.get("src")?.folders).toEqual(["src/ui"]);
    expect(graph.edges).toHaveLength(4);
    expect(graph.externalEdges).toHaveLength(2);
    expect([...graph.externals.keys()]).toEqual(["ext:react"]);
    expect(graph.incoming.get("src/a.ts")).toEqual(["src/c.ts"]);
  });

  it("detects the a -> b -> c -> a cycle and nothing else", () => {
    expect(graph.cycles).toEqual([["src/a.ts", "src/b.ts", "src/c.ts"]]);
    expect(findCycles(new Map([["x", ["y"]], ["y", []]]))).toEqual([]);
  });

  it("computes only real stats", () => {
    const s = computeStats(graph);
    expect(s).toMatchObject({ files: 6, folders: 3, sourceFiles: 5, parsedFiles: 4, importEdges: 4, externalPackages: 1 });
    expect(s.mostImported?.count).toBe(1);
    expect(s.filesInCycles).toBe(3);
  });
});

describe("source selection", () => {
  it("ranks entry points and shallow files first, tests and vendored code last", () => {
    const files = [
      "src/deep/er/est/thing.ts",
      "src/index.ts",
      "node_modules/x/index.js",
      "src/a.test.ts",
      "dist/out.js",
      "README.md",
      "lib/util.ts",
    ].map((path) => toCodeFile({ path }));
    const { selected, eligible } = selectSourceFiles(files, 10);
    expect(eligible).toBe(4);
    expect(selected[0]?.path).toBe("src/index.ts");
    expect(selected.at(-1)?.path).toBe("src/a.test.ts");
    expect(isTestPath("pkg/foo_test.go")).toBe(true);
  });

  it("caps the selection", () => {
    const files = Array.from({ length: 20 }, (_, i) => toCodeFile({ path: `src/f${i}.ts` }));
    expect(selectSourceFiles(files, 5).selected).toHaveLength(5);
  });
});
