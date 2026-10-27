"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { GitBranch, MessagesSquare, Network, ScanSearch, ShieldCheck } from "lucide-react";
import { H2 } from "@/components/seo/blocks";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";

function Node({ label, icon, nodeRef, strong }: { label: string; icon: ReactNode; nodeRef: RefObject<HTMLDivElement | null>; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div
        ref={nodeRef}
        className={`z-10 flex items-center justify-center rounded-full border bg-white shadow-nv-card ${strong ? "size-16 border-nv-copper-400 text-nv-copper-400" : "size-12 border-nv-graphite-600 text-nv-ivory-200"}`}
      >
        <span aria-hidden className="size-5 [&>svg]:size-full">
          {icon}
        </span>
      </div>
      <span className="text-center text-nv-micro text-nv-ivory-200">{label}</span>
    </div>
  );
}

/** One repository goes in; chat answers, an architecture map, a security report and a shared report come out. */
export function OutputsFlow() {
  const box = useRef<HTMLDivElement>(null);
  const repo = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const o1 = useRef<HTMLDivElement>(null);
  const o2 = useRef<HTMLDivElement>(null);
  const o3 = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="sol-flow-h" className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        <H2 id="sol-flow-h">One repository, three ways out</H2>
        <p className="mt-4 max-w-prose text-nv-lead text-nv-ivory-200 text-pretty">
          The same read of the repository feeds the chat, the architecture view and the security scan, and ends in a report you can share.
        </p>
      </div>
      <div ref={box} className="relative flex items-center justify-between gap-4 rounded-nv-lg border border-nv-graphite-700 bg-white px-4 py-10 shadow-nv-card sm:px-10 lg:col-span-7">
        <Node nodeRef={repo} label="Repository" icon={<GitBranch />} />
        <Node nodeRef={hub} label="Novaris" icon={<ScanSearch />} strong />
        <div className="flex flex-col gap-7">
          <Node nodeRef={o1} label="Cited answers" icon={<MessagesSquare />} />
          <Node nodeRef={o2} label="Architecture map" icon={<Network />} />
          <Node nodeRef={o3} label="Security report" icon={<ShieldCheck />} />
        </div>
        <AnimatedBeam containerRef={box} fromRef={repo} toRef={hub} />
        <AnimatedBeam containerRef={box} fromRef={hub} toRef={o1} curvature={28} delay={0.5} />
        <AnimatedBeam containerRef={box} fromRef={hub} toRef={o2} delay={0.9} />
        <AnimatedBeam containerRef={box} fromRef={hub} toRef={o3} curvature={-28} delay={1.3} />
      </div>
    </section>
  );
}
