"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "./cn";
import { Citation } from "./evidence";

export interface CodeBlockProps {
  code: string;
  language?: string;
  /** File path shown in the frame header; renders as a Citation chip when provided. */
  path?: string;
  startLine?: number;
  /** 1-based line numbers (absolute) to mark as the cited lines. */
  highlight?: number[];
  className?: string;
}

/** Frame only: caller supplies highlighted tokens via react-syntax-highlighter later. Plain, selectable, scrollable. */
export function CodeBlock({ code, language, path, startLine = 1, highlight = [], className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className={cn("overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-950", className)}>
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-nv-graphite-700 bg-nv-graphite-850 px-3">
        <span className="flex min-w-0 items-center gap-2">
          {path ? <Citation kind="file" target={path} /> : <span className="nv-eyebrow">{language ?? "text"}</span>}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-nv-sm px-2 text-nv-small text-nv-ivory-200 hover:text-nv-ivory-50"
        >
          {copied ? <Check aria-hidden className="size-4 text-nv-success" /> : <Copy aria-hidden className="size-4" />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </figcaption>
      <div role="region" tabIndex={0} aria-label={path ? `Code from ${path}` : "Code"} className="overflow-auto">
        <pre className="m-0 min-w-max py-3 font-mono text-[0.8125rem] leading-6 text-nv-ivory-100">
          <code>
            {lines.map((l, i) => {
              const n = startLine + i;
              const hit = highlight.includes(n);
              return (
                <span key={n} className={cn("flex px-3", hit && "bg-nv-copper-wash shadow-[inset_2px_0_0_var(--nv-copper-400)]")}>
                  <span aria-hidden className="nv-num mr-4 w-8 shrink-0 select-none text-right text-nv-graphite-400">
                    {n}
                  </span>
                  <span className="whitespace-pre">{l || " "}</span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </figure>
  );
}
