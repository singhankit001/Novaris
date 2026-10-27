"use client";

import { Fragment, createRef, useEffect, useRef, useState, type RefObject } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, FileCode2, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";
import { Terminal, type TerminalLine } from "@/components/fx/code/terminal";
import { CanvasReveal } from "@/components/fx/scene/canvas-reveal";
import { DemoFrame, SeverityTag, type DemoFinding } from "../shared";

const STAGES = [
  { id: "scope", title: "Scope", text: "Pick a repository and a quick or deep scan. Deep scans need sign-in." },
  { id: "select", title: "File selection", text: "Code and config files are chosen up to a fixed budget; dependency manifests are handled separately." },
  { id: "pattern", title: "Pattern checks", text: "Rules look for known risky constructs in the selected files and check manifests against advisories." },
  { id: "model", title: "Model review", text: "A model reads a capped set of the selected files for issues patterns miss." },
  { id: "findings", title: "Findings", text: "Each finding has a severity, a file and lines. Verify each one before acting." },
] as const;

const LOG: TerminalLine[][] = [
  [{ kind: "output", text: "scope: acme/payments-api (sample), quick scan" }],
  [
    { kind: "output", text: "listing repository tree" },
    { kind: "output", text: "selecting code and config files within the budget" },
  ],
  [
    { kind: "output", text: "pattern checks on selected files" },
    { kind: "warn", text: "match: literal secret assigned in config" },
    { kind: "warn", text: "match: query string built with +" },
  ],
  [
    { kind: "output", text: "model review of a capped file subset" },
    { kind: "warn", text: "note: verbose error returned to client" },
  ],
  [{ kind: "success", text: "4 sample findings listed, each needs verification" }],
];

const FILES = ["src/config/session.ts", "src/db/reports.ts", "package.json", "src/api/errors.ts"];
const FINDINGS: (DemoFinding & { fileIndex: number })[] = [
  { id: "f1", severity: "high", title: "Hard-coded secret in config", file: FILES[0]!, lines: "12", why: "A signing secret is a string literal. Read it from the environment instead.", fileIndex: 0 },
  { id: "f2", severity: "high", title: "SQL built by string concatenation", file: FILES[1]!, lines: "41-47", why: "User input reaches the query text. Use parameters.", fileIndex: 1 },
  { id: "f3", severity: "medium", title: "Outdated dependency with a published advisory", file: FILES[2]!, lines: "27", why: "A fictional package, left-pad-utils@1.2.0, pinned below a patched release.", fileIndex: 2 },
  { id: "f4", severity: "low", title: "Verbose error returned to client", file: FILES[3]!, lines: "8-10", why: "Internal error text is sent in the response body.", fileIndex: 3 },
];

export function SecurityScannerExperience() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.35 });
  const [stage, setStage] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const current = reduce ? (stage ?? STAGES.length - 1) : (stage ?? 0);
  const last = STAGES.length - 1;

  useEffect(() => {
    if (reduce || !playing || !inView || current >= last) return;
    const t = setTimeout(() => setStage(current + 1), 3200);
    return () => clearTimeout(t);
  }, [reduce, playing, inView, current, last]);

  const go = (n: number) => {
    setPlaying(false);
    setStage(Math.max(0, Math.min(last, n)));
  };
  const restart = () => {
    setStage(0);
    setPlaying(true);
  };

  const lines = LOG.slice(0, current + 1).flat();
  const showFindings = current === last;

  const [fileRefs] = useState(() => FILES.map(() => createRef<HTMLElement>()));
  const [findRefs] = useState(() => FINDINGS.map(() => createRef<HTMLElement>()));
  const flow = useRef<HTMLDivElement>(null);

  return (
    <DemoFrame
      title="Step through a sample scan"
      note="Stages mirror how Novaris scans. The repository, files and findings are invented patterns, not results from a real scan."
    >
      <div ref={box} className="grid gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Previous stage" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-nv-sm border border-nv-graphite-600 bg-white disabled:opacity-40">
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={() => go(current + 1)} disabled={current === last} aria-label="Next stage" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-nv-sm border border-nv-graphite-600 bg-white disabled:opacity-40">
            <ChevronRight aria-hidden className="size-4" />
          </button>
          {!reduce && current < last ? (
            <button type="button" onClick={() => setPlaying((p) => !p)} className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small">
              {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
              {playing ? "Pause" : "Auto-play"}
            </button>
          ) : null}
          <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small">
            <RotateCcw aria-hidden className="size-4" />
            Restart
          </button>
          <p aria-live="polite" className="m-0 ms-auto text-nv-small text-nv-ivory-300">
            Stage {current + 1} of {STAGES.length}: <span className="font-medium text-nv-ivory-100">{STAGES[current]!.title}</span>
          </p>
        </div>

        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-5">
          {STAGES.map((s, i) => {
            const done = i < current;
            const on = i === current;
            return (
              <li key={s.id} aria-current={on ? "step" : undefined} className="min-w-0">
                <button type="button" onClick={() => go(i)} className="block h-full w-full text-left">
                  <CanvasReveal active={on} className={cn("h-full rounded-nv-md border bg-white", on ? "border-nv-copper-700 shadow-nv-lift" : "border-nv-graphite-700")}>
                    <div className="p-4">
                      <span className={cn("inline-flex size-6 items-center justify-center rounded-full border text-nv-micro font-medium", done ? "border-nv-success-edge bg-nv-success-wash text-nv-success" : on ? "border-nv-copper-700 bg-nv-copper-wash text-nv-ivory-100" : "border-nv-graphite-600 text-nv-graphite-400")}>
                        {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                        {done ? <span className="sr-only">Done</span> : null}
                      </span>
                      <h3 className="m-0 mt-2 text-nv-small font-semibold text-nv-ivory-100">{s.title}</h3>
                      <p className="m-0 mt-1 text-nv-micro leading-snug text-nv-ivory-300">{s.text}</p>
                    </div>
                  </CanvasReveal>
                </button>
              </li>
            );
          })}
        </ol>

        <Terminal title="illustrative scan log" lines={lines} />

        <div ref={flow} className="relative grid gap-3 md:grid-cols-2 md:gap-x-24">
          {showFindings && inView ? (
            <div aria-hidden className="hidden md:contents">
              {FINDINGS.map((f, i) => (
                <AnimatedBeam key={f.id} containerRef={flow} fromRef={fileRefs[f.fileIndex]!} toRef={findRefs[i]!} curvature={0} duration={2.6} delay={i * 0.3} />
              ))}
            </div>
          ) : null}
          <h3 className="m-0 text-nv-small font-medium text-nv-ivory-100">Selected files (sample)</h3>
          <h3 className="m-0 hidden text-nv-small font-medium text-nv-ivory-100 md:block">Findings (sample)</h3>
          {FINDINGS.map((f, i) => (
            <Fragment key={f.id}>
              <div ref={fileRefs[f.fileIndex] as RefObject<HTMLDivElement>} className="relative z-10 flex min-h-11 items-center gap-2 self-center rounded-nv-sm border border-nv-graphite-700 bg-white px-3 py-2 font-nv-mono text-nv-micro">
                <FileCode2 aria-hidden className="size-4 shrink-0 text-nv-graphite-400" />
                <span className="truncate">{FILES[f.fileIndex]}</span>
              </div>
              {showFindings ? (
                <div ref={findRefs[i] as RefObject<HTMLDivElement>} className="relative z-10 rounded-nv-sm border border-nv-graphite-700 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityTag severity={f.severity} />
                    <span className="text-nv-small font-medium text-nv-ivory-100">{f.title}</span>
                  </div>
                  <code className="mt-1 block break-all font-nv-mono text-nv-micro text-nv-ivory-300">
                    {f.file}:{f.lines}
                  </code>
                  <p className="m-0 mt-1 text-nv-micro text-nv-ivory-300">{f.why}</p>
                </div>
              ) : (
                <p className="m-0 self-center rounded-nv-sm border border-dashed border-nv-graphite-500 bg-nv-graphite-850 px-3 py-2 text-nv-micro text-nv-ivory-300">Listed after the last stage completes.</p>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </DemoFrame>
  );
}
