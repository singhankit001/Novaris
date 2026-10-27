"use client";

import { useRef, useState } from "react";
import { Database, FileCode2, GitBranch, Globe, KeyRound, ScanSearch, ShieldCheck, Webhook } from "lucide-react";
import { AnimatedBeam } from "./animated-beam";
import { FileTree, type TreeNode } from "./file-tree";
import { OrbitingCircles, type OrbitItem } from "./orbiting-circles";

export const SAMPLE_TREE: TreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/lib",
        name: "lib",
        children: [
          { id: "src/lib/auth.ts", name: "auth.ts", status: "flagged" },
          { id: "src/lib/db.ts", name: "db.ts", status: "context" },
        ],
      },
      {
        id: "src/app",
        name: "app/api/scan",
        children: [{ id: "src/app/route.ts", name: "route.ts", status: "changed" }],
      },
      { id: "src/middleware.ts", name: "middleware.ts", status: "context" },
    ],
  },
  { id: "prisma", name: "prisma", children: [{ id: "prisma/schema.prisma", name: "schema.prisma" }] },
  { id: "package.json", name: "package.json" },
];

export function FileTreeDemo() {
  const [picked, setPicked] = useState<string | null>("src/lib/auth.ts");
  return (
    <div className="max-w-sm">
      <FileTree
        label="Repository files"
        nodes={SAMPLE_TREE}
        defaultExpanded={["src", "src/lib"]}
        selected={picked}
        onSelect={(n) => setPicked(n.id)}
      />
      <p aria-live="polite" className="mt-2 font-nv-mono text-nv-micro text-nv-graphite-400">
        Selected: {picked ?? "none"}
      </p>
    </div>
  );
}

function Node({ label, icon, nodeRef, strong }: { label: string; icon: React.ReactNode; nodeRef: React.RefObject<HTMLDivElement | null>; strong?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={nodeRef} className={`z-10 flex size-12 items-center justify-center rounded-full border bg-white shadow-nv-card ${strong ? "size-16 border-nv-copper-400 text-nv-copper-400" : "border-nv-graphite-600 text-nv-ivory-200"}`}>
        <span aria-hidden className="size-5 [&>svg]:size-full">{icon}</span>
      </div>
      <span className="text-center text-nv-micro text-nv-ivory-300">{label}</span>
    </div>
  );
}

/** Source repos stream into the Novaris scanner, which fans out to report outputs. */
export function BeamDemo() {
  const box = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  return (
    <div ref={box} className="relative mx-auto flex max-w-xl items-center justify-between gap-4 rounded-nv-lg border border-nv-graphite-700 bg-white px-4 py-10 shadow-nv-card sm:px-10">
      <div className="flex flex-col gap-8">
        <Node nodeRef={a} label="GitHub" icon={<GitBranch />} />
        <Node nodeRef={b} label="Lockfiles" icon={<FileCode2 />} />
        <Node nodeRef={c} label="Env config" icon={<KeyRound />} />
      </div>
      <Node nodeRef={hub} label="Scanner" icon={<ScanSearch />} strong />
      <div className="flex flex-col gap-8">
        <Node nodeRef={r1} label="Report" icon={<ShieldCheck />} />
        <Node nodeRef={r2} label="Webhook" icon={<Webhook />} />
      </div>
      <AnimatedBeam containerRef={box} fromRef={a} toRef={hub} curvature={30} />
      <AnimatedBeam containerRef={box} fromRef={b} toRef={hub} delay={0.4} />
      <AnimatedBeam containerRef={box} fromRef={c} toRef={hub} curvature={-30} delay={0.8} />
      <AnimatedBeam containerRef={box} fromRef={hub} toRef={r1} curvature={24} delay={1.2} />
      <AnimatedBeam containerRef={box} fromRef={hub} toRef={r2} curvature={-24} delay={1.6} />
    </div>
  );
}

const OUTER: OrbitItem[] = [
  { id: "git", label: "Git history", icon: <GitBranch /> },
  { id: "db", label: "Database schema", icon: <Database /> },
  { id: "web", label: "Public endpoints", icon: <Globe /> },
  { id: "key", label: "Secrets", icon: <KeyRound /> },
];

export function OrbitDemo() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      <OrbitingCircles items={OUTER} duration={36} scale={0.82} />
      <OrbitingCircles items={OUTER.slice(0, 2).map((i) => ({ ...i, id: `in-${i.id}` }))} duration={24} reverse scale={0.45} />
      <div className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-nv-copper-700 bg-nv-copper-wash text-nv-copper-400">
        <ScanSearch aria-label="Novaris scan" className="size-7" />
      </div>
    </div>
  );
}
