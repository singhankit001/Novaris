"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/components/nv/cn";

export interface TerminalLine {
  kind: "command" | "output" | "success" | "warn" | "error";
  text: string;
}

/**
 * Typed commands + streamed output, sequenced, started and paused by visibility, with a replay control.
 * Reduced motion shows the whole transcript. The full transcript is also exposed as sr-only text.
 */
export interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
  className?: string;
}

const TONE: Record<TerminalLine["kind"], string> = {
  command: "text-nv-ivory-50",
  output: "text-nv-ivory-300",
  success: "text-nv-success",
  warn: "text-nv-warning",
  error: "text-nv-danger",
};
const MARK: Record<TerminalLine["kind"], string> = { command: "$", output: " ", success: "+", warn: "!", error: "x" };

export function Terminal({ lines, title = "novaris", className }: TerminalProps) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.3 });
  const pos = useRef({ li: 0, ci: 0 });
  const [, bump] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const p = pos.current;
      const l = lines[p.li];
      if (!l) return;
      let wait: number;
      if (l.kind === "command" && p.ci < l.text.length) {
        p.ci++;
        wait = 28;
      } else {
        wait = l.kind === "command" ? 380 : 150;
        p.li++;
        p.ci = 0;
      }
      bump((n) => n + 1);
      t = setTimeout(tick, wait);
    };
    t = setTimeout(tick, 250);
    return () => clearTimeout(t);
  }, [reduce, inView, lines, run]);

  function replay() {
    pos.current = { li: 0, ci: 0 };
    setRun((n) => n + 1);
    bump((n) => n + 1);
  }

  const { li, ci } = reduce ? { li: lines.length, ci: 0 } : pos.current;
  const done = li >= lines.length;

  return (
    <div ref={box} className={cn("overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-850 shadow-nv-card", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-nv-graphite-700 bg-white px-3">
        <span className="flex items-center gap-2 font-nv-mono text-nv-micro text-nv-graphite-400">
          <span aria-hidden className="size-2 rounded-full bg-nv-graphite-600" />
          {title}
        </span>
        <button
          type="button"
          onClick={replay}
          disabled={!!reduce}
          aria-label="Replay terminal session"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-nv-sm px-2 text-nv-small text-nv-ivory-200 transition-colors hover:bg-nv-graphite-800 disabled:hidden"
        >
          <RotateCcw aria-hidden className="size-4" />
          <span aria-hidden className="hidden sm:inline">Replay</span>
        </button>
      </div>
      <pre className="sr-only">{lines.map((l) => `${l.kind === "command" ? "$ " : ""}${l.text}`).join("\n")}</pre>
      <div aria-hidden className="overflow-x-auto p-4 font-nv-mono text-[0.8125rem] leading-6">
        {lines.map((l, i) => {
          const shown = i < li || (i === li && l.kind === "command" && ci > 0);
          const text = i === li && l.kind === "command" ? l.text.slice(0, ci) : l.text;
          return (
            <div key={i} className={cn("flex gap-3 whitespace-pre", TONE[l.kind], !shown && "invisible")}>
              <span className={cn("w-3 shrink-0 select-none", l.kind === "command" ? "text-nv-copper-400" : "")}>{MARK[l.kind]}</span>
              <span>
                {text || " "}
                {i === li && !done && !reduce && l.kind === "command" ? <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-nv-copper-400" /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
