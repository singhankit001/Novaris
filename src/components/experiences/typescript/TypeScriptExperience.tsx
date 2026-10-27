"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";
import { CodeBlock } from "@/components/fx/code/code-block";
import { CodeComparison } from "@/components/fx/code/code-comparison";
import { FileTree, type TreeNode } from "@/components/fx/code/file-tree";
import type { CodeLang } from "@/components/fx/code/highlight";
import { TracingBeam } from "@/components/fx/surface/tracing-beam";
import { cn } from "@/components/nv/cn";
import { IllustrativeTag } from "../IllustrativeTag";

const INVOICES = `import type { ApiResult, Invoice } from "../../types/api";
import { client } from "./client";

export async function latestInvoice(): Promise<string> {
  const page: ApiResult<Invoice[]> = await client.get("/invoices");
  const cursor: string = page.nextCursor;
  const first = page.data[0];
  const paid = first.paidAt.toISOString();
  return \`\${first.id}:\${paid}:\${cursor}\`;
}
`;

const INVOICES_FIXED = `import type { ApiResult, Invoice } from "../../types/api";
import { client } from "./client";

export async function latestInvoice(): Promise<string | null> {
  const page: ApiResult<Invoice[]> = await client.get("/invoices");
  const first = page.data[0];
  if (!first) return null;
  const paid = first.paidAt?.toISOString() ?? "unpaid";
  return \`\${first.id}:\${paid}:\${page.nextCursor ?? "end"}\`;
}
`;

const API_TS = `export interface ApiResult<T> {
  data: T;
  error?: string;
  nextCursor: string | null;
}

export interface Invoice {
  id: string;
  total: number;
  paidAt: Date | null;
}
`;

const TSCONFIG = `{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "types"]
}
`;

interface Diagnostic {
  id: string;
  code: string;
  line: number;
  message: string;
  why: string;
  source: { file: string; lang: CodeLang; code: string; line: number; note: string };
}

const DIAGNOSTICS: Diagnostic[] = [
  {
    id: "cursor",
    code: "TS2322",
    line: 6,
    message: "Type 'string | null' is not assignable to type 'string'.",
    why: "ApiResult declares nextCursor as nullable, so the last page has no cursor.",
    source: { file: "types/api.ts", lang: "ts", code: API_TS, line: 4, note: "nullable on the last page" },
  },
  {
    id: "index",
    code: "TS18048",
    line: 8,
    message: "'first' is possibly 'undefined'.",
    why: "tsconfig.json turns on noUncheckedIndexedAccess, so data[0] may be undefined on an empty page.",
    source: { file: "tsconfig.json", lang: "json", code: TSCONFIG, line: 4, note: "makes array reads possibly undefined" },
  },
  {
    id: "paid",
    code: "TS18047",
    line: 8,
    message: "'first.paidAt' is possibly 'null'.",
    why: "Invoice.paidAt is Date | null. This surfaces once the previous diagnostic is fixed.",
    source: { file: "types/api.ts", lang: "ts", code: API_TS, line: 10, note: "null until the invoice is paid" },
  },
];

const TREE: TreeNode[] = [
  { id: "tsconfig.json", name: "tsconfig.json", status: "context" },
  { id: "types", name: "types", children: [{ id: "types/api.ts", name: "api.ts", status: "context" }] },
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/services",
        name: "services",
        children: [
          { id: "src/services/invoices.ts", name: "invoices.ts", status: "flagged" },
          { id: "src/services/client.ts", name: "client.ts" },
        ],
      },
    ],
  },
];

const FILE_NOTES: Record<string, string> = {
  "tsconfig.json": "Compiler flags decide what counts as an error. strict and noUncheckedIndexedAccess are on, and paths maps @/* to src.",
  "types/api.ts": "Shared declarations. ApiResult<T> and Invoice are imported by services, so a change here reaches every consumer.",
  "src/services/invoices.ts": "Implementation under review. It imports both types and reads data[0] from a generic ApiResult.",
  "src/services/client.ts": "Transport helper. Not part of any diagnostic in this example.",
};

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ts-step-${n}`} className="grid gap-4">
      <div>
        <p className="nv-eyebrow m-0">Step {n}</p>
        <h3 id={`ts-step-${n}`} className="m-0 mt-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Diagnostics() {
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const d = DIAGNOSTICS[active] ?? DIAGNOSTICS[0];
  if (!d) return null;
  return (
    <div className="grid gap-4">
      <ul aria-label="Diagnostics" className="m-0 grid list-none gap-2 p-0 md:grid-cols-3">
        {DIAGNOSTICS.map((x, i) => (
          <li key={x.id}>
            <button
              type="button"
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "flex min-h-11 w-full items-start gap-2 rounded-nv-sm border p-3 text-left text-nv-small transition-colors",
                i === active ? "border-nv-copper-400 bg-nv-copper-wash" : "border-nv-graphite-700 bg-white hover:bg-nv-graphite-800",
              )}
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-nv-danger" />
              <span className="min-w-0">
                <span className="block font-nv-mono text-nv-micro text-nv-graphite-400">{x.code} · invoices.ts:{x.line}</span>
                <span className="block text-nv-ivory-100">{x.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div ref={box} className="relative grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="min-w-0">
          <p className="m-0 mb-2 flex items-center gap-2 font-nv-mono text-nv-micro text-nv-graphite-400">
            <span ref={a} className="relative z-10 rounded-full bg-nv-danger-wash px-2 py-0.5 font-nv-sans font-medium text-nv-danger">Offending line {d.line}</span>
          </p>
          <CodeBlock key={`l${d.id}`} tabs={[{ filename: "src/services/invoices.ts", code: INVOICES, highlight: [d.line] }]} />
        </div>
        <div className="min-w-0">
          <p className="m-0 mb-2 flex items-center gap-2 font-nv-mono text-nv-micro text-nv-graphite-400">
            <span ref={b} className="relative z-10 rounded-full bg-nv-violet-wash px-2 py-0.5 font-nv-sans font-medium text-nv-violet-600">Depends on {d.source.file}:{d.source.line}</span>
          </p>
          <CodeBlock key={`r${d.id}`} tabs={[{ filename: d.source.file, code: d.source.code, lang: d.source.lang, highlight: [d.source.line], annotations: { [d.source.line]: d.source.note } }]} />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 max-md:hidden">
          <AnimatedBeam containerRef={box} fromRef={a} toRef={b} curvature={28} duration={2.6} />
        </div>
      </div>
      <p aria-live="polite" className="m-0 rounded-nv-sm border border-nv-graphite-700 bg-white p-3 text-nv-small leading-relaxed text-nv-ivory-200">
        <strong className="text-nv-ivory-100">{d.code}.</strong> {d.why}
      </p>
    </div>
  );
}

function ProjectMap() {
  const [file, setFile] = useState("src/services/invoices.ts");
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <FileTree label="TypeScript project files" nodes={TREE} defaultExpanded={["types", "src", "src/services"]} selected={file} onSelect={(n) => setFile(n.id)} />
      <div aria-live="polite" className="rounded-nv-md border border-nv-graphite-700 bg-white p-4 shadow-nv-card">
        <p className="m-0 font-nv-mono text-nv-micro text-nv-graphite-400">{file}</p>
        <p className="m-0 mt-2 text-nv-small leading-relaxed text-nv-ivory-200">{FILE_NOTES[file]}</p>
        <p className="m-0 mt-3 text-nv-micro text-nv-graphite-400">Files marked In context are read together with the file that shows the error.</p>
      </div>
    </div>
  );
}

export function TypeScriptExperience(): ReactNode {
  return (
    <div className="grid gap-6">
      <IllustrativeTag>Sample TypeScript project and compiler messages written for this page. Not output from a Novaris run.</IllustrativeTag>
      <TracingBeam>
        <div className="grid gap-14">
          <Step n={1} title="Read the project, not just the file">
            <ProjectMap />
          </Step>
          <Step n={2} title="Follow each diagnostic to the type it depends on">
            <Diagnostics />
          </Step>
          <Step n={3} title="Fix it where the types say it belongs">
            <CodeComparison filename="src/services/invoices.ts" beforeCode={INVOICES} afterCode={INVOICES_FIXED} afterLabel="Suggested" />
          </Step>
        </div>
      </TracingBeam>
    </div>
  );
}
