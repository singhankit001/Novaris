"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { CodeLines } from "./code-lines";
import type { CodeLang } from "./highlight";

/** One file tab. `annotations` and `highlight` use absolute line numbers. */
export interface CodeTab {
  filename: string;
  code: string;
  lang?: CodeLang;
  startLine?: number;
  highlight?: number[];
  annotations?: Record<number, ReactNode>;
}

/** Filename tab bar + numbered, highlightable code with copy. */
export interface CodeBlockProps {
  tabs: CodeTab[];
  className?: string;
}

export function CodeBlock({ tabs, className }: CodeBlockProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = tabs[Math.min(active, tabs.length - 1)];
  if (!tab) return null;

  function onKey(e: KeyboardEvent) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : d ? (active + d + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className={cn("m-0 overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-white shadow-nv-card", className)}>
      <div className="flex min-h-11 items-stretch justify-between border-b border-nv-graphite-700 bg-[linear-gradient(180deg,#f8f9fb,#f1f2f5)]">
        <div role="tablist" aria-label="Files" onKeyDown={onKey} className="flex min-w-0 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.filename}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${uid}-t${i}`}
              aria-selected={i === active}
              aria-controls={`${uid}-p`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "min-h-11 shrink-0 border-b-2 px-3 font-nv-mono text-nv-small transition-colors",
                i === active ? "border-nv-copper-400 bg-white text-nv-ivory-100" : "border-transparent text-nv-graphite-400 hover:text-nv-ivory-100",
              )}
            >
              {t.filename}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center gap-1.5 px-3 text-nv-small text-nv-ivory-200 transition-colors hover:bg-white hover:text-nv-ivory-50"
        >
          {copied ? <Check aria-hidden className="size-4 text-nv-success" /> : <Copy aria-hidden className="size-4" />}
          <span aria-hidden className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div id={`${uid}-p`} role="tabpanel" aria-labelledby={`${uid}-t${active}`} tabIndex={0} className="overflow-auto">
        <CodeLines code={tab.code} lang={tab.lang} startLine={tab.startLine} highlight={tab.highlight} annotations={tab.annotations} />
      </div>
    </figure>
  );
}
