"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, GitBranch, Package, Play } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { CodeLines } from "@/components/fx/code/code-lines";
import { CardBody, CardContainer, CardItem } from "@/components/fx/scene/card-3d";
import { DemoFrame, SeverityTag, type DemoFinding } from "../shared";

interface Dep {
  name: string;
  version: string;
  via?: string;
  flagged?: boolean;
}
interface Issue extends DemoFinding {
  snippet: string;
  start: number;
}
interface Repo {
  id: string;
  name: string;
  blurb: string;
  lang: string;
  deps: Dep[];
  issues: Issue[];
}

const REPOS: Repo[] = [
  {
    id: "queue",
    name: "acme-oss/queue-runner",
    blurb: "Background job runner for Node services.",
    lang: "TypeScript",
    deps: [
      { name: "job-store-kit", version: "3.1.0" },
      { name: "cron-lite", version: "1.0.2" },
      { name: "retry-utils", version: "2.4.0", via: "job-store-kit" },
      { name: "old-shell-quote", version: "0.4.1", via: "cron-lite", flagged: true },
    ],
    issues: [
      { id: "q1", severity: "high", title: "Shell command built from job input", file: "src/worker/exec.ts", lines: "22-26", why: "Job fields are joined into a command string. Pass arguments as an array.", start: 22, snippet: 'const cmd = "convert " + job.input + " out.png";\nawait run(cmd);' },
      { id: "q2", severity: "medium", title: "Dependency with a published advisory", file: "package.json", lines: "18", why: "old-shell-quote is a fictional package pinned below its patched release.", start: 18, snippet: '"old-shell-quote": "0.4.1"' },
    ],
  },
  {
    id: "form",
    name: "acme-oss/form-kit",
    blurb: "Headless form components with validation.",
    lang: "TypeScript",
    deps: [
      { name: "schema-lite", version: "5.0.1" },
      { name: "html-escape-mini", version: "1.1.0" },
      { name: "field-mask", version: "0.9.0", via: "schema-lite" },
    ],
    issues: [
      { id: "f1", severity: "medium", title: "Unescaped HTML in rendered output", file: "src/render/field.tsx", lines: "34", why: "A label from props is inserted as raw HTML. Render it as text.", start: 34, snippet: "<span dangerouslySetInnerHTML={{ __html: label }} />" },
      { id: "f2", severity: "low", title: "Permissive default for allowed origins", file: "src/config.ts", lines: "6", why: 'The default origin list is ["*"]. Require callers to set it.', start: 6, snippet: 'export const origins = ["*"];' },
    ],
  },
  {
    id: "log",
    name: "acme-oss/log-shipper",
    blurb: "Ships structured logs to a collector over HTTPS.",
    lang: "Go",
    deps: [
      { name: "batch-writer", version: "0.7.3" },
      { name: "tls-helpers", version: "1.2.0" },
      { name: "wire-codec", version: "2.0.0", via: "batch-writer" },
    ],
    issues: [
      { id: "l1", severity: "high", title: "TLS verification switched off", file: "client/http.go", lines: "58", why: "The client skips certificate checks. Remove the flag or limit it to tests.", start: 58, snippet: "InsecureSkipVerify: true," },
    ],
  },
];

const STEPS = ["Fetch repository metadata", "Read the file tree", "Select files within the budget", "Pattern and dependency checks", "Preview issues"];

export function OssScannerExperience() {
  const reduce = useReducedMotion();
  const [id, setId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const repo = REPOS.find((r) => r.id === id);
  const done = step >= STEPS.length;

  useEffect(() => {
    if (!id || reduce || step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [id, step, reduce]);

  function run(rid: string) {
    setId(rid);
    setStep(reduce ? STEPS.length : 0);
  }

  return (
    <DemoFrame
      title="Pick a sample repository and watch the scan journey"
      note="All three repositories, their dependencies and issues are invented. A real scan reads the repository you choose, and every finding still needs your verification."
    >
      <div className="grid gap-8">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {REPOS.map((r) => (
            <li key={r.id}>
              <CardContainer>
                <CardBody className={cn("p-5", id === r.id && "border-nv-copper-700")}>
                  <CardItem translateZ={24} className="block">
                    <span className="flex items-center gap-2 font-nv-mono text-nv-small font-medium text-nv-ivory-100">
                      <GitBranch aria-hidden className="size-4 text-nv-copper-400" />
                      {r.name}
                    </span>
                  </CardItem>
                  <CardItem translateZ={12} className="mt-2 block w-full">
                    <p className="m-0 text-nv-small text-nv-ivory-300">{r.blurb}</p>
                    <p className="m-0 mt-1 text-nv-micro text-nv-graphite-400">
                      {r.lang} · {r.deps.length} sample dependencies
                    </p>
                  </CardItem>
                  <CardItem translateZ={30} className="mt-4 block">
                    <button
                      type="button"
                      aria-pressed={id === r.id}
                      onClick={() => run(r.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small font-medium hover:bg-nv-graphite-800"
                    >
                      <Play aria-hidden className="size-4" />
                      {id === r.id ? "Run again" : "Run sample scan"}
                    </button>
                  </CardItem>
                </CardBody>
              </CardContainer>
            </li>
          ))}
        </ul>

        <div aria-live="polite">
          {!repo ? (
            <p className="m-0 rounded-nv-sm border border-dashed border-nv-graphite-500 bg-nv-graphite-850 p-4 text-nv-small text-nv-ivory-300">
              Choose a repository card to run its sample scan journey.
            </p>
          ) : (
            <div className="grid gap-8">
              <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-5" aria-label={`Scan journey for ${repo.name}`}>
                {STEPS.map((s, i) => {
                  const state = i < step ? "done" : i === step ? "now" : "next";
                  return (
                    <li key={s} aria-current={state === "now" ? "step" : undefined} className="min-w-0">
                      <div className="h-1 overflow-hidden rounded-full bg-nv-graphite-700">
                        <div className={cn("h-full origin-left bg-nv-copper-400 transition-transform duration-700 ease-nv-out motion-reduce:transition-none", state === "next" ? "scale-x-0" : state === "now" ? "scale-x-50" : "scale-x-100")} />
                      </div>
                      <p className={cn("m-0 mt-2 flex items-start gap-1.5 text-nv-micro", state === "next" ? "text-nv-graphite-400" : "text-nv-ivory-100")}>
                        {state === "done" ? <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-nv-success" /> : null}
                        <span>
                          {s}
                          <span className="sr-only">{state === "done" ? ", done" : state === "now" ? ", in progress" : ", pending"}</span>
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ol>

              {done ? (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <section aria-label="Dependency relationships">
                    <h3 className="m-0 mb-3 text-nv-small font-medium text-nv-ivory-100">Dependency relationships (sample)</h3>
                    <div className="rounded-nv-md border border-nv-graphite-700 bg-white p-4">
                      <p className="m-0 flex items-center gap-2 font-nv-mono text-nv-small font-medium text-nv-ivory-100">
                        <Package aria-hidden className="size-4 text-nv-copper-400" />
                        {repo.name.split("/")[1]}
                      </p>
                      <ul className="m-0 mt-2 grid list-none gap-1.5 border-s border-nv-graphite-600 p-0 ps-4">
                        {repo.deps.filter((d) => !d.via).map((d) => (
                          <li key={d.name} className="text-nv-small">
                            <DepRow d={d} />
                            <ul className="m-0 mt-1 grid list-none gap-1 border-s border-dashed border-nv-graphite-500 p-0 ps-4">
                              {repo.deps.filter((t) => t.via === d.name).map((t) => (
                                <li key={t.name}>
                                  <DepRow d={t} />
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                  <section aria-label="Security issue previews">
                    <h3 className="m-0 mb-3 text-nv-small font-medium text-nv-ivory-100">Issue previews (sample)</h3>
                    <ul className="m-0 grid list-none gap-3 p-0">
                      {repo.issues.map((x) => (
                        <li key={x.id} className="overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-white">
                          <div className="p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <SeverityTag severity={x.severity} />
                              <span className="text-nv-small font-medium text-nv-ivory-100">{x.title}</span>
                            </div>
                            <code className="mt-1 block break-all font-nv-mono text-nv-micro text-nv-ivory-300">
                              {x.file}:{x.lines}
                            </code>
                            <p className="m-0 mt-1 text-nv-micro text-nv-ivory-300">{x.why}</p>
                          </div>
                          <div role="region" tabIndex={0} aria-label={`Sample code for ${x.title}`} className="overflow-x-auto border-t border-nv-graphite-700 bg-nv-graphite-850">
                            <CodeLines code={x.snippet} startLine={x.start} highlight={[x.start]} lang={x.file.endsWith(".go") ? "text" : "ts"} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}

function DepRow({ d }: { d: Dep }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <code className="font-nv-mono text-nv-micro text-nv-ivory-100">
        {d.name}@{d.version}
      </code>
      {d.flagged ? <SeverityTag severity="medium" /> : null}
    </span>
  );
}
