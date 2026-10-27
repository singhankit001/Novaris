"use client";

import { useState } from "react";
import { cn } from "@/components/nv/cn";
import { CodeComparison } from "@/components/fx/code/code-comparison";
import { ArchitectureGraph } from "@/components/fx/graph/architecture-graph";
import type { ArchEdge, ArchNode } from "@/components/fx/graph/graph-types";
import { ExpandableCards } from "@/components/fx/surface/expandable-cards";
import { DemoFrame, SeverityTag } from "../shared";

interface Case {
  id: string;
  flagged: string;
  severity: "high" | "medium";
  title: string;
  path: string[];
  explain: string;
  fixLabel: string;
  file: string;
  lang: "json" | "ts";
  before: string;
  after: string;
}

const CASES: Case[] = [
  {
    id: "merge",
    flagged: "tiny-merge",
    severity: "high",
    title: "Unsafe object merge in a transitive dependency",
    path: ["pkg", "web-server-kit", "body-reader", "tiny-merge"],
    explain:
      "Your code never imports tiny-merge. It arrives through web-server-kit, which depends on body-reader, which merges request objects with it. A merge that copies special keys such as __proto__ can let a request alter shared object behaviour. The package and advisory here are fictional.",
    fixLabel: "Override the transitive version",
    file: "package.json",
    lang: "json",
    before: `{
  "dependencies": {
    "web-server-kit": "^4.2.0"
  }
}`,
    after: `{
  "dependencies": {
    "web-server-kit": "^4.2.0"
  },
  "overrides": {
    "tiny-merge": "^1.2.4"
  }
}`,
  },
  {
    id: "crypto",
    flagged: "legacy-crypto-shim",
    severity: "medium",
    title: "Unmaintained crypto shim with no patched release",
    path: ["pkg", "form-utils", "session-store", "legacy-crypto-shim"],
    explain:
      "form-utils reaches legacy-crypto-shim through session-store. The shim has no maintained release, so an override cannot help. The fix is in your own code: stop calling the shim and use the Node built-in. The package is fictional.",
    fixLabel: "Replace the call with node:crypto",
    file: "src/lib/ids.ts",
    lang: "ts",
    before: `import { token } from "legacy-crypto-shim";

export const newId = () => token(16);`,
    after: `import { randomBytes } from "node:crypto";

export const newId = () => randomBytes(16).toString("hex");`,
  },
];

const NODES: ArchNode[] = [
  { id: "pkg", label: "package.json", kind: "module", x: 0, y: 130, detail: "acme/api (sample)" },
  { id: "web-server-kit", label: "web-server-kit", kind: "file", x: 250, y: 30, detail: "direct 4.2.0" },
  { id: "form-utils", label: "form-utils", kind: "file", x: 250, y: 230, detail: "direct 1.4.3" },
  { id: "body-reader", label: "body-reader", kind: "external", x: 500, y: 0, detail: "transitive 2.1.0" },
  { id: "route-kit", label: "route-kit", kind: "external", x: 500, y: 100, detail: "transitive 3.0.1" },
  { id: "session-store", label: "session-store", kind: "external", x: 500, y: 230, detail: "transitive 0.8.2" },
  { id: "tiny-merge", label: "tiny-merge", kind: "finding", severity: "high", x: 750, y: 0, detail: "1.2.0 (sample)" },
  { id: "legacy-crypto-shim", label: "legacy-crypto-shim", kind: "finding", severity: "medium", x: 750, y: 230, detail: "0.3.0 (sample)" },
];
const EDGES: ArchEdge[] = [
  { id: "a", from: "pkg", to: "web-server-kit" },
  { id: "b", from: "pkg", to: "form-utils" },
  { id: "c", from: "web-server-kit", to: "body-reader" },
  { id: "d", from: "web-server-kit", to: "route-kit" },
  { id: "e", from: "form-utils", to: "session-store" },
  { id: "f", from: "body-reader", to: "tiny-merge" },
  { id: "g", from: "session-store", to: "legacy-crypto-shim" },
];

export function NodejsScannerExperience() {
  const [sel, setSel] = useState(CASES[0]!.id);
  const c = CASES.find((x) => x.id === sel)!;
  const name = (id: string) => NODES.find((n) => n.id === id)!.label;

  return (
    <DemoFrame
      title="Trace a sample dependency path"
      note="Package names, versions and the advisories described are invented to show how a transitive path reads. Nothing here is a real vulnerability or real scan output."
    >
      <div className="grid gap-8">
        <div>
          <div role="group" aria-label="Choose a flagged dependency" className="mb-4 flex flex-wrap gap-2">
            {CASES.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={sel === x.id}
                onClick={() => setSel(x.id)}
                className={cn("inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small", sel === x.id && "border-nv-copper-700 bg-nv-copper-wash")}
              >
                <SeverityTag severity={x.severity} />
                <code className="font-nv-mono text-nv-micro">{x.flagged}</code>
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            <ArchitectureGraph nodes={NODES} edges={EDGES} label="Sample dependency graph from package.json to a flagged transitive package" height={360} highlightIds={c.path} />
          </div>
          <div className="md:hidden">
            <h3 className="m-0 mb-2 text-nv-small font-medium text-nv-ivory-100">Path to {c.flagged}</h3>
            <ol className="m-0 grid list-none gap-0 border-s-2 border-nv-copper-400 p-0 ps-4">
              {c.path.map((id, i) => (
                <li key={id} className="relative py-2 text-nv-small">
                  <span aria-hidden className="absolute -start-[1.4rem] top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-nv-copper-400" />
                  <code className="font-nv-mono text-nv-ivory-100">{name(id)}</code>
                  <span className="ms-2 text-nv-micro text-nv-graphite-400">{i === 0 ? "your project" : i === c.path.length - 1 ? "flagged" : i === 1 ? "direct" : "transitive"}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="m-0 mt-3 text-nv-small text-nv-ivory-300">
            Path: <code className="break-words font-nv-mono text-nv-micro text-nv-ivory-100">{c.path.map(name).join(" > ")}</code>
          </p>
        </div>

        <ExpandableCards
          items={CASES.map((x) => ({
            id: x.id,
            eyebrow: x.severity === "high" ? "High, sample" : "Medium, sample",
            title: x.title,
            summary: `${x.flagged} via ${name(x.path[1]!)}`,
            detail: (
              <div className="grid gap-2">
                <p className="m-0">{x.explain}</p>
                <p className="m-0 font-medium text-nv-ivory-100">Path</p>
                <code className="break-words font-nv-mono text-nv-micro">{x.path.map(name).join(" > ")}</code>
              </div>
            ),
          }))}
        />

        <div>
          <h3 className="m-0 mb-3 text-nv-small font-medium text-nv-ivory-100">Sample fix: {c.fixLabel}</h3>
          <CodeComparison key={c.id} beforeCode={c.before} afterCode={c.after} filename={c.file} lang={c.lang} />
        </div>
      </div>
    </DemoFrame>
  );
}
