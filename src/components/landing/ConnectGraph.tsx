"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { FileCode2, GitCommitHorizontal, GitBranch, MessageSquare, ShieldCheck, Database } from "lucide-react";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

interface Pt {
  x: number;
  y: number;
}
interface Node {
  id: string;
  label: string;
  Icon: typeof GitBranch;
  d: Pt; // desktop coords in a 1000x520 box
  m: Pt; // mobile coords in a 390x500 box
}

const NODES: Node[] = [
  { id: "github", label: "GitHub", Icon: GitBranch, d: { x: 130, y: 90 }, m: { x: 78, y: 60 } },
  { id: "repos", label: "Repositories", Icon: Database, d: { x: 90, y: 260 }, m: { x: 78, y: 140 } },
  { id: "commits", label: "Commits", Icon: GitCommitHorizontal, d: { x: 130, y: 430 }, m: { x: 78, y: 340 } },
  { id: "files", label: "Files", Icon: FileCode2, d: { x: 870, y: 90 }, m: { x: 312, y: 60 } },
  { id: "scanner", label: "Security scanner", Icon: ShieldCheck, d: { x: 910, y: 260 }, m: { x: 300, y: 140 } },
  { id: "chat", label: "Chat", Icon: MessageSquare, d: { x: 870, y: 430 }, m: { x: 312, y: 340 } },
];
const DESK = { w: 1000, h: 520, c: { x: 500, y: 260 } };
const MOB = { w: 390, h: 440, c: { x: 195, y: 215 } };

function curve(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
}

function Svg({ box, which, active, animate, refEl }: { box: typeof DESK; which: "d" | "m"; active: string | null; animate: boolean; refEl?: (el: SVGSVGElement | null) => void }) {
  return (
    <svg ref={refEl} className={cn(s.gSvg, which === "d" ? s.gDesk : s.gMob)} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden focusable="false">
      {NODES.map((n, i) => {
        const left = n.d.x < 500 ? true : false;
        const from = which === "d" ? n.d : n.m;
        const d = left ? curve(from, box.c) : curve(box.c, from);
        // packets flow outward from Novaris on the right, inward on the left
        return (
          <g key={n.id}>
            <path d={d} className={cn(s.gPath, active === n.id && s.gPathOn)} />
            {animate && (
              <>
                <circle r="3.4" className={i % 2 ? s.gPacketDusk : s.gPacketBlue}>
                  <animateMotion dur="3.6s" begin={`${-i * 0.7}s`} repeatCount="indefinite" path={d} />
                </circle>
                <circle r="2.6" className={i % 2 ? s.gPacketBlue : s.gPacketDusk}>
                  <animateMotion dur="3.6s" begin={`${-i * 0.7 - 1.8}s`} repeatCount="indefinite" path={d} />
                </circle>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ConnectGraph() {
  const reduce = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const visible = useInView(host, { margin: "80px" });
  const [active, setActive] = useState<string | null>(null);
  const svgs = useRef<(SVGSVGElement | null)[]>([]);

  // Pause SMIL packets when off-screen or under reduced motion.
  useEffect(() => {
    for (const el of svgs.current) {
      if (!el) continue;
      if (visible && !reduce) el.unpauseAnimations();
      else el.pauseAnimations();
    }
  }, [visible, reduce]);

  return (
    <div ref={host} className={s.graph}>
      <Svg box={DESK} which="d" active={active} animate={!reduce} refEl={(el) => { svgs.current[0] = el; }} />
      <Svg box={MOB} which="m" active={active} animate={!reduce} refEl={(el) => { svgs.current[1] = el; }} />
      <div className={s.gCore} aria-hidden>
        <span className={s.gCoreName}>novaris</span>
      </div>
      <ul className={s.gNodes} aria-label="Novaris connects to">
        {NODES.map(({ id, label, Icon, d, m }) => (
          <li
            key={id}
            className={cn(s.gNode, active === id && s.gNodeOn)}
            style={{ "--dx": `${(d.x / DESK.w) * 100}%`, "--dy": `${(d.y / DESK.h) * 100}%`, "--mx": `${(m.x / MOB.w) * 100}%`, "--my": `${(m.y / MOB.h) * 100}%` } as React.CSSProperties}
            onPointerEnter={() => setActive(id)}
            onPointerLeave={() => setActive(null)}
          >
            <span aria-hidden className={s.gNodeIcon}>
              <Icon className="size-4" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
