"use client";

import { type ReactNode, useRef } from "react";
import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { useMedia } from "./shared";

/**
 * HeroParallax: three rows of cards slide sideways (alternating) while the block rises and
 * un-tilts as the page scrolls. The scroll is the page's own: a sticky stage inside a taller
 * section, nothing is captured or snapped. Below 768px and under prefers-reduced-motion it
 * renders a plain static grid. Props: items (cards), header (heading content), className.
 */
export interface ParallaxItem {
  title: string;
  meta: string;
  href?: string;
  visual?: ReactNode;
}

function Card({ item }: { item: ParallaxItem }) {
  const body = (
    <>
      <div className="relative h-28 overflow-hidden rounded-nv-md bg-nv-graphite-850" aria-hidden="true">
        {item.visual}
      </div>
      <p className="mt-3 truncate text-nv-body font-semibold text-nv-ivory-100">{item.title}</p>
      <p className="mt-0.5 truncate font-nv-mono text-nv-micro text-nv-ivory-300">{item.meta}</p>
    </>
  );
  const cls = "nv-card block w-full p-3 transition-shadow duration-200 hover:shadow-[var(--nv-shadow-lift)] focus-visible:shadow-[var(--nv-shadow-lift)]";
  return item.href ? (
    <a href={item.href} className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Row({ items, x }: { items: ParallaxItem[]; x: MotionValue<number> }) {
  return (
    <motion.div className="flex w-max gap-5 will-change-transform" style={{ x }}>
      {items.map((it) => (
        <div key={it.title} className="w-64 shrink-0">
          <Card item={it} />
        </div>
      ))}
    </motion.div>
  );
}

export function HeroParallax({ items, header, className }: { items: ParallaxItem[]; header: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const wide = useMedia("(min-width: 768px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const right = useTransform(scrollYProgress, [0, 1], [-140, 220]);
  const left = useTransform(scrollYProgress, [0, 1], [160, -220]);
  const rotateX = useTransform(scrollYProgress, [0, 0.25], [14, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0.35, 1]);
  const y = useTransform(scrollYProgress, [0, 0.25], [-60, 0]);

  if (reduced || !wide) {
    return (
      <section className={cn("py-12", className)}>
        <div className="mb-8">{header}</div>
        <ul className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
          {items.map((it) => (
            <li key={it.title}>
              <Card item={it} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const third = Math.ceil(items.length / 3);
  const rows = [items.slice(0, third), items.slice(third, third * 2), items.slice(third * 2)];
  return (
    <section ref={ref} className={cn("relative h-[170vh]", className)}>
      <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden py-10">
        <div className="mb-10">{header}</div>
        <motion.div className="space-y-5 [perspective:1200px]" style={{ rotateX, opacity, y }}>
          <Row items={rows[0] ?? []} x={right} />
          <Row items={rows[1] ?? []} x={left} />
          <Row items={rows[2] ?? []} x={right} />
        </motion.div>
      </div>
    </section>
  );
}
