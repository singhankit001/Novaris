"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { FileCode2, Pause, Play } from "lucide-react";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";
import { CodeBlock } from "@/components/fx/code/code-block";
import { CodeComparison } from "@/components/fx/code/code-comparison";
import { FileTree } from "@/components/fx/code/file-tree";
import { Terminal } from "@/components/fx/code/terminal";
import { cn } from "@/components/nv/cn";
import { Basis, IllustrativeTag } from "../IllustrativeTag";
import { BILLING_AFTER, BILLING_BEFORE, CALLERS, IMPORTS, SESSION_TS, STAGES, TERMINAL, treeFor } from "./sample";

const OPEN = ["src", "src/lib", "src/lib/auth", "src/app"];

function Chip({ label, hint, nodeRef, strong }: { label: string; hint?: string; nodeRef?: RefObject<HTMLDivElement | null>; strong?: boolean }) {
  return (
    <div
      ref={nodeRef}
      className={cn(
        "relative z-10 min-w-0 rounded-nv-sm border bg-white px-2 py-1.5 max-sm:px-1font-nv-mono text-[0.625rem] leading-snug shadow-nv-xs sm:text-nv-small",
        strong ? "border-nv-copper-400 text-nv-ivory-50 shadow-nv-card" : "border-nv-graphite-600 text-nv-ivory-200",
      )}
    >
      <span className="block break-words max-sm:hidden">{label}</span>
      <span className="block break-words sm:hidden">{label.startsWith("next/") ? label : label.replace(/^.*\//, "")}</span>
      {hint ? <span className="block font-nv-sans text-nv-micro text-nv-graphite-400 max-sm:hidden">{hint}</span> : null}
    </div>
  );
}

function DependencyView() {
  const box = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const c0 = useRef<HTMLDivElement>(null);
  const c1 = useRef<HTMLDivElement>(null);
  const c2 = useRef<HTMLDivElement>(null);
  const i0 = useRef<HTMLDivElement>(null);
  const i1 = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={box} className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3 py-2 sm:gap-x-14">
        <div className="grid gap-3">
          <p className="m-0 text-nv-micro font-medium uppercase tracking-wider text-nv-graphite-400">Callers</p>
          <Chip label={CALLERS[0].path} hint={CALLERS[0].note} nodeRef={c0} />
          <Chip label={CALLERS[1].path} hint={CALLERS[1].note} nodeRef={c1} />
          <Chip label={CALLERS[2].path} hint={CALLERS[2].note} nodeRef={c2} />
        </div>
        <Chip label="session.ts" hint="readSession()" nodeRef={hub} strong />
        <div className="grid gap-3">
          <p className="m-0 text-nv-micro font-medium uppercase tracking-wider text-nv-graphite-400">Imports</p>
          <Chip label={IMPORTS[0].path} nodeRef={i0} />
          <Chip label={IMPORTS[1].path} nodeRef={i1} />
        </div>
        <AnimatedBeam containerRef={box} fromRef={c0} toRef={hub} curvature={12} />
        <AnimatedBeam containerRef={box} fromRef={c1} toRef={hub} curvature={12} delay={0.4} />
        <AnimatedBeam containerRef={box} fromRef={c2} toRef={hub} curvature={12} delay={0.8} />
        <AnimatedBeam containerRef={box} fromRef={hub} toRef={i0} curvature={-12} />
        <AnimatedBeam containerRef={box} fromRef={hub} toRef={i1} curvature={-12} delay={0.4} />
      </div>
      <ul className="m-0 mt-4 grid list-none gap-1 p-0 text-nv-small text-nv-ivory-200">
        <li className="flex flex-wrap items-center gap-2">
          <Basis kind="Measured" /> 3 files import readSession; session.ts imports 2 modules (counted in the example repository).
        </li>
      </ul>
    </div>
  );
}

function ReviewNote() {
  return (
    <div className="grid gap-4">
      <article className="rounded-nv-md border border-nv-copper-700 bg-white p-4 shadow-nv-card">
        <p className="m-0 font-nv-mono text-nv-micro text-nv-graphite-400">Review note · cites src/lib/auth/session.ts:13 and src/app/api/billing/route.ts:5</p>
        <h4 className="m-0 mt-1 text-nv-body font-semibold text-nv-ivory-100">readSession() can now return null, and one caller does not expect it</h4>
        <ul className="m-0 mt-3 grid list-none gap-2.5 p-0 text-nv-small leading-relaxed text-nv-ivory-200">
          <li className="flex flex-wrap items-start gap-2"><Basis kind="Measured" /><span className="min-w-0 flex-1">session.ts:13 returns null for an expired token. Two of three callers check for it.</span></li>
          <li className="flex flex-wrap items-start gap-2"><Basis kind="Measured" /><span className="min-w-0 flex-1">api/billing/route.ts:5 destructures the result with no null check.</span></li>
          <li className="flex flex-wrap items-start gap-2"><Basis kind="Inferred" /><span className="min-w-0 flex-1">An expired session would reach line 5 as null and throw a TypeError, so the route answers 500 instead of 401.</span></li>
        </ul>
      </article>
      <CodeBlock
        tabs={[
          {
            filename: "app/api/billing/route.ts",
            code: BILLING_BEFORE,
            highlight: [5],
            annotations: { 5: "Not visible in the session.ts diff" },
          },
        ]}
      />
    </div>
  );
}

function StagePanel({ stage }: { stage: number }) {
  switch (stage) {
    case 0:
      return <CodeBlock tabs={[{ filename: "src/lib/auth/session.ts", code: SESSION_TS, highlight: [13], annotations: { 13: "Changed in the diff: expired tokens now return null" } }]} />;
    case 1:
      return <Terminal title="novaris review" lines={TERMINAL} />;
    case 2:
      return <DependencyView />;
    case 3:
      return <ReviewNote />;
    default:
      return <CodeComparison filename="src/app/api/billing/route.ts" beforeCode={BILLING_BEFORE} afterCode={BILLING_AFTER} afterLabel="Suggested" />;
  }
}

export function ReviewExperience(): ReactNode {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.35 });
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [touched, setTouched] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const auto = playing && inView && !reduce;
  const last = STAGES.length - 1;

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setStage((s) => (s >= last ? 0 : s + 1)), STAGES[stage]?.ms ?? 5000);
    return () => clearTimeout(t);
  }, [auto, stage, last]);

  function pick(i: number) {
    setStage(i);
    setTouched(true);
    setPlaying(false);
  }
  function onKey(e: KeyboardEvent) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? last : d ? (stage + d + STAGES.length) % STAGES.length : -1;
    if (next < 0) return;
    e.preventDefault();
    pick(next);
    tabs.current[next]?.focus();
  }

  const cur = STAGES[stage] ?? STAGES[0];
  return (
    <div ref={box} className="rounded-nv-lg border border-nv-graphite-700 bg-[linear-gradient(180deg,#fbfbfe,#f3f4fb)] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IllustrativeTag>Sample repository written for this page. Not output from a Novaris run.</IllustrativeTag>
        {reduce ? null : (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-700 bg-white px-3 text-nv-small text-nv-ivory-200 transition-colors hover:bg-nv-graphite-800"
          >
            {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            {playing ? "Pause demo" : "Auto-play demo"}
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Review stages" onKeyDown={onKey} className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
        {STAGES.map((s, i) => (
          <button
            key={s.label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`rv-tab-${i}`}
            aria-selected={i === stage}
            aria-controls="rv-panel"
            tabIndex={i === stage ? 0 : -1}
            onClick={() => pick(i)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-nv-sm border px-2 text-nv-small transition-colors",
              i === stage ? "border-nv-copper-400 bg-nv-copper-wash font-medium text-nv-ivory-50" : "border-nv-graphite-700 bg-white text-nv-ivory-300 hover:bg-nv-graphite-800",
            )}
          >
            <span className="nv-num font-nv-mono text-nv-micro">{i + 1}</span>
            <span className="max-sm:sr-only">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="min-w-0 max-lg:order-2">
          <FileTree label="Example repository files" nodes={treeFor(stage)} defaultExpanded={OPEN} selected="session" onSelect={(n) => n.id === "session" && pick(1)} />
          <p className="m-0 mt-2 text-nv-micro text-nv-graphite-400">Select session.ts to start the review. Files marked In context are read alongside it.</p>
        </div>

        <div className="min-w-0 pb-4 [perspective:1400px]">
          <div className="relative [transform-style:preserve-3d]">
            <span aria-hidden className="absolute inset-0 rounded-nv-md border border-nv-graphite-700 bg-white/60 [transform:translate3d(0,16px,-48px)_scale(0.96)] max-sm:hidden" />
            <span aria-hidden className="absolute inset-0 rounded-nv-md border border-nv-graphite-700 bg-white/80 [transform:translate3d(0,8px,-24px)_scale(0.98)] max-sm:hidden" />
            <div id="rv-panel" role="tabpanel" aria-labelledby={`rv-tab-${stage}`} className="relative rounded-nv-md border border-nv-graphite-700 bg-white p-4 shadow-nv-lift sm:p-5 lg:min-h-[27rem]">
              <p className="m-0 flex items-center gap-2 text-nv-micro font-medium uppercase tracking-wider text-nv-graphite-400">
                <FileCode2 aria-hidden className="size-3.5" /> Stage {stage + 1} of {STAGES.length}
              </p>
              <h3 className="m-0 mt-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{cur.title}</h3>
              <p className="m-0 mt-1 mb-4 text-nv-small leading-relaxed text-nv-ivory-300">{cur.text}</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={stage}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0.12 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                >
                  <StagePanel stage={stage} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {touched ? `Stage ${stage + 1} of ${STAGES.length}: ${cur.title}` : ""}
      </p>
    </div>
  );
}
