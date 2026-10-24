"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

interface N {
  x: number;
  y: number;
  r: number;
  tone?: "violet" | "ion";
}

const CORE = { x: 500, y: 235 };

/** Hand-placed so server and client render identically. Depth layers move at different parallax rates. */
const FAR: N[] = [
  { x: 70, y: 70, r: 5 }, { x: 250, y: 40, r: 4 }, { x: 760, y: 36, r: 5, tone: "violet" }, { x: 930, y: 90, r: 4 },
  { x: 40, y: 330, r: 4, tone: "ion" }, { x: 960, y: 340, r: 5 }, { x: 330, y: 440, r: 4 }, { x: 700, y: 436, r: 4, tone: "violet" },
];
const MID: N[] = [
  { x: 190, y: 130, r: 8 }, { x: 330, y: 215, r: 7, tone: "violet" }, { x: 160, y: 300, r: 9 }, { x: 410, y: 345, r: 7, tone: "ion" },
  { x: 810, y: 150, r: 8 }, { x: 670, y: 120, r: 7, tone: "ion" }, { x: 850, y: 290, r: 9, tone: "violet" }, { x: 600, y: 360, r: 7 },
];
const NEAR: N[] = [
  { x: 330, y: 70, r: 11 }, { x: 110, y: 205, r: 12, tone: "violet" }, { x: 255, y: 385, r: 11 },
  { x: 700, y: 275, r: 11, tone: "ion" }, { x: 905, y: 205, r: 12 }, { x: 560, y: 80, r: 10, tone: "violet" },
];

function edge(a: { x: number; y: number }, b: { x: number; y: number }, bend = 0.18) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = -(b.y - a.y) * bend;
  const ny = (b.x - a.x) * bend;
  return `M${a.x} ${a.y} Q${mx + nx} ${my + ny} ${b.x} ${b.y}`;
}

const PACKET_PATHS = [NEAR[0], NEAR[1], NEAR[2], NEAR[3], NEAR[4], MID[1], MID[6], MID[5]].map((n) => edge(n as N, CORE));

function Layer({ nodes, depth, className }: { nodes: N[]; depth: number; className?: string }) {
  return (
    <>
      {nodes.map((n, i) => (
        <g key={`${depth}-${i}`}>
          <path d={edge(n, CORE, depth === 0 ? 0.25 : 0.15)} className={cn(s.edge, depth === 0 && s.edgeFar)} />
          <circle cx={n.x} cy={n.y} r={n.r} className={cn(s.node, n.tone === "violet" && s.nodeViolet, n.tone === "ion" && s.nodeIon, className)} />
          {depth === 2 && <circle cx={n.x} cy={n.y} r={n.r * 0.38} fill="var(--nv-copper-400)" opacity="0.85" />}
        </g>
      ))}
    </>
  );
}

const CHIPS = [
  { x: "21%", y: "20%", label: "src/middleware.ts", ok: false, mobile: true },
  { x: "80%", y: "70%", label: "lib/auth.ts#L12-40", ok: true, mobile: true },
  { x: "16%", y: "74%", label: "prisma/schema.prisma", ok: false, mobile: false },
  { x: "78%", y: "16%", label: "Measured", ok: true, mobile: false },
];

export default function Constellation() {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(hostRef, { margin: "80px" });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 70, damping: 18, mass: 0.6 });
  const farX = useTransform(sx, (v) => v * -6);
  const farY = useTransform(sy, (v) => v * -4);
  const midX = useTransform(sx, (v) => v * -16);
  const midY = useTransform(sy, (v) => v * -10);
  const nearX = useTransform(sx, (v) => v * -30);
  const nearY = useTransform(sy, (v) => v * -18);
  const chipX = useTransform(sx, (v) => v * 22);
  const chipY = useTransform(sy, (v) => v * 14);

  // SMIL packets pause off-screen and never run under reduced motion.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (reduce || !inView) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }, [inView, reduce]);

  const animated = !reduce;
  // Pointer parallax only reacts to mouse events (fine pointers); touch never moves the layers.
  const parallax = animated;

  return (
    <div
      ref={hostRef}
      className={cn(s.constellation, !inView && s.paused)}
      onPointerMove={(e) => {
        if (!parallax || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <svg ref={svgRef} className={s.cSvg} viewBox="0 0 1000 470" aria-hidden focusable="false" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cEdge" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f54ff" />
            <stop offset="0.55" stopColor="#7a4dff" />
            <stop offset="1" stopColor="#19b6e6" />
          </linearGradient>
          <radialGradient id="cCore">
            <stop offset="0" stopColor="#7a4dff" stopOpacity="0.28" />
            <stop offset="0.55" stopColor="#2f54ff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2f54ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.g className={s.cLayer} style={{ x: parallax ? farX : 0, y: parallax ? farY : 0 }}>
          <Layer nodes={FAR} depth={0} className={s.nodeFar} />
        </motion.g>
        <motion.g className={s.cLayer} style={{ x: parallax ? midX : 0, y: parallax ? midY : 0 }}>
          <Layer nodes={MID} depth={1} />
        </motion.g>
        <motion.g className={s.cLayer} style={{ x: parallax ? nearX : 0, y: parallax ? nearY : 0 }}>
          <Layer nodes={NEAR} depth={2} />
          {animated &&
            PACKET_PATHS.map((d, i) => (
              <circle key={i} r="3.2" className={s.packet}>
                <animateMotion dur={`${3.4 + (i % 4) * 0.7}s`} begin={`${-i * 0.9}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
              </circle>
            ))}
        </motion.g>
        <circle cx={CORE.x} cy={CORE.y} r="150" className={s.coreHalo} />
        <circle cx={CORE.x} cy={CORE.y} r="58" className={s.coreRing} />
        <circle cx={CORE.x} cy={CORE.y} r="40" className={s.coreDisc} />
        <circle cx={CORE.x} cy={CORE.y} r="14" fill="url(#cEdge)" />
      </svg>
      <motion.div className={s.cChips} aria-hidden style={{ x: parallax ? chipX : 0, y: parallax ? chipY : 0 }}>
        {CHIPS.map((c) => (
          <span key={c.label} className={cn(s.cChip, c.ok && s.cChipOk, !c.mobile && s.cChipHideM)} style={{ left: c.x, top: c.y }}>
            <span className={s.cChipDot} />
            {c.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
