"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { BasisTag } from "@/components/nv/badge";
import { ArchitectureGraph } from "@/components/fx/graph/architecture-graph";
import { GraphList } from "@/components/fx/graph/graph-list";
import type { ArchEdge, ArchNode } from "@/components/fx/graph/graph-types";
import { BentoGrid, BentoItem } from "@/components/fx/surface/bento-grid";
import { DemoFrame } from "../shared";

const PANELS = [
  { id: "hotspots", title: "Hotspots", text: "A file that changes often and also carries a finding is a better place to start a review than either signal alone." },
  { id: "deps", title: "Dependency exposure", text: "A flagged package matters more when a path from your own code reaches it. The graph shows the path, not a score." },
  { id: "owners", title: "Ownership", text: "Unclear or single-person ownership slows fixes. Novaris describes it in words and says when the data does not show it." },
  { id: "basis", title: "Evidence basis", text: "Every statement is measured, inferred or not available. Anything the data does not show is stated as unknown." },
] as const;

const FILES = [
  { f: "src/billing/invoice.ts", churn: "high", finding: true },
  { f: "src/auth/session.ts", churn: "high", finding: true },
  { f: "src/api/router.ts", churn: "high", finding: false },
  { f: "src/utils/format.ts", churn: "low", finding: false },
  { f: "src/legacy/export.ts", churn: "low", finding: true },
];

const NODES: ArchNode[] = [
  { id: "app", label: "your app", kind: "module", x: 0, y: 50, detail: "sample" },
  { id: "dep", label: "csv-export-kit", kind: "external", x: 250, y: 50, detail: "direct (fictional)" },
  { id: "flag", label: "xml-parse-lite", kind: "finding", severity: "medium", x: 500, y: 50, detail: "transitive (fictional)" },
];
const EDGES: ArchEdge[] = [
  { id: "1", from: "app", to: "dep", animated: true },
  { id: "2", from: "dep", to: "flag", animated: true },
];

const OWNERS = [
  ["billing/", "Clear owner", "No concern"],
  ["auth/", "Shared by many", "Review who can approve"],
  ["legacy/", "No recent owner shown", "Possible single point of knowledge"],
];

export function RiskAnalysisExperience() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.3 });
  const [cycle, setCycle] = useState(0);
  const [held, setHeld] = useState<string | null>(null);

  useEffect(() => {
    if (reduce || held || !inView) return;
    const t = setInterval(() => setCycle((c) => (c + 1) % PANELS.length), 4000);
    return () => clearInterval(t);
  }, [reduce, held, inView]);

  const shown = PANELS.find((p) => p.id === held) ?? PANELS[cycle]!;
  const hold = (id: string) => ({ onPointerEnter: () => setHeld(id), onPointerLeave: () => setHeld(null), onFocus: () => setHeld(id), onBlur: () => setHeld(null) });

  return (
    <DemoFrame
      title="A sample risk read"
      note="Files, packages and labels are invented. Labels are qualitative on purpose: there is no risk score, and no number on this page comes from a real repository."
    >
      <div ref={box}>
        <BentoGrid>
          <article {...hold("hotspots")} className="nv-card flex flex-col gap-4 p-5 md:col-span-2">
            <div>
              <h3 className="m-0 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">Hotspots</h3>
              <p className="m-0 mt-1 text-nv-small text-nv-ivory-300">Files that change often and also carry a finding.</p>
            </div>
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
              {FILES.map((x) => {
                const first = x.churn === "high" && x.finding;
                return (
                  <li key={x.f} className={cn("rounded-nv-sm border px-3 py-2", first ? "border-nv-warning-edge bg-nv-warning-wash" : "border-nv-graphite-700 bg-white")}>
                    <code className="block break-all font-nv-mono text-nv-micro text-nv-ivory-100">{x.f}</code>
                    <p className="m-0 mt-1 text-nv-micro text-nv-ivory-300">
                      Changes: {x.churn === "high" ? "frequent" : "rare"} · Finding: {x.finding ? "yes" : "none shown"}
                    </p>
                    {first ? <p className="m-0 mt-1 text-nv-micro font-medium text-nv-warning">Review first</p> : null}
                  </li>
                );
              })}
            </ul>
          </article>

          <BentoItem
            title="Ownership"
            summary="Described in words, never as a number."
            detail="Where the data does not show an owner, Novaris says so instead of guessing."
            header={
              <ul className="m-0 grid list-none gap-1 p-0 text-nv-micro">
                {OWNERS.map(([p, o]) => (
                  <li key={p} className="rounded-nv-xs border border-nv-graphite-700 bg-white px-2 py-1">
                    <code className="font-nv-mono">{p}</code> {o}
                  </li>
                ))}
              </ul>
            }
          />

          <article {...hold("deps")} className="nv-card flex flex-col gap-3 p-5 md:col-span-2">
            <h3 className="m-0 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">Dependency exposure</h3>
            <div className="hidden md:block">
              <ArchitectureGraph nodes={NODES} edges={EDGES} label="Sample path from the app to a flagged transitive package" height={200} controls={false} highlightIds={["app", "dep", "flag"]} />
            </div>
            <div className="md:hidden">
              <GraphList nodes={NODES} edges={EDGES} label="Sample path from the app to a flagged transitive package" />
            </div>
          </article>

          <article aria-live="polite" {...hold("basis")} className="nv-card flex flex-col justify-between gap-4 bg-nv-graphite-850 p-5" tabIndex={0}>
            <div className="min-h-32">
              <span className="nv-eyebrow block">How to read this panel</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={shown.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
                  <h3 className="m-0 mt-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{shown.title}</h3>
                  <p className="m-0 mt-2 text-nv-small leading-relaxed text-nv-ivory-200">{shown.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <BasisTag basis="measured" />
              <BasisTag basis="inferred" />
              <BasisTag basis="unknown" />
            </div>
          </article>
        </BentoGrid>
      </div>
    </DemoFrame>
  );
}
