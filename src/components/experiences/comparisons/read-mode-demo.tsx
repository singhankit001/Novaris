"use client";

import { useState } from "react";
import { CodeBlock, type CodeTab } from "@/components/fx/code/code-block";
import { cn } from "@/components/nv/cn";

const HANDLER = `import { readFile } from "node:fs/promises";
import { sanitizePath } from "../lib/paths";

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("file") ?? "";
  const safe = sanitizePath(name);
  return new Response(await readFile(safe));
}`;

const HELPER = `import path from "node:path";

const BASE = "/srv/exports";

export function sanitizePath(name: string) {
  const full = path.resolve(BASE, name);
  if (!full.startsWith(BASE + path.sep)) throw new Error("bad path");
  return full;
}`;

const MODES = [
  {
    id: "single",
    label: "One file at a time",
    tabs: [{ filename: "routes/export.ts", code: HANDLER, highlight: [7] }] as CodeTab[],
    note: "Reading only this file, the value passed to readFile came from a query parameter. What sanitizePath does is not visible here.",
  },
  {
    id: "context",
    label: "With repository context",
    tabs: [
      { filename: "routes/export.ts", code: HANDLER, highlight: [2, 6] },
      { filename: "lib/paths.ts", code: HELPER, highlight: [7, 8] },
    ] as CodeTab[],
    note: "Following the import to lib/paths.ts shows the path is resolved against a base directory and rejected if it escapes it. The finding can be read with that in view.",
  },
];

/** Illustrates what a one-file read can and cannot see versus a repository-context read. Sample code, not tool output. */
export function ReadModeDemo() {
  const [mode, setMode] = useState(0);
  const m = MODES[mode] ?? MODES[0]!;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-4">
        <p className="nv-eyebrow">Same code, two reads</p>
        <div role="radiogroup" aria-label="Read mode" className="mt-4 grid gap-2">
          {MODES.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={mode === i}
              onClick={() => setMode(i)}
              className={cn(
                "min-h-11 rounded-nv-md border px-4 py-3 text-left text-nv-small font-medium transition-colors duration-200 motion-reduce:transition-none",
                mode === i ? "border-nv-copper-700 bg-nv-copper-wash text-nv-ivory-50" : "border-nv-graphite-700 bg-white text-nv-ivory-200",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="mt-5 text-nv-small leading-relaxed text-nv-ivory-200 text-pretty">
          {m.note}
        </p>
        <p className="mt-4 text-nv-micro text-nv-text-muted">Illustrative sample code. Not output from any tool.</p>
      </div>
      <div className="min-w-0 lg:col-span-8">
        <CodeBlock key={m.id} tabs={m.tabs} />
      </div>
    </div>
  );
}
