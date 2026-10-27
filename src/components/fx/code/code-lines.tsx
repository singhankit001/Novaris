import type { ReactNode } from "react";
import { cn } from "@/components/nv/cn";
import { highlightLine, type CodeLang } from "./highlight";

/** Lines of code: absolute line numbers, highlighted ranges, pinned annotations, add/remove tone. Server-safe. */
export interface CodeLinesProps {
  code: string;
  lang?: CodeLang;
  startLine?: number;
  /** Absolute line numbers to emphasise. */
  highlight?: number[];
  /** Notes pinned under an absolute line number. */
  annotations?: Record<number, ReactNode>;
  tone?: "neutral" | "add" | "remove";
  /** Absolute line numbers that take the add/remove tone; every line when omitted. */
  toneLines?: number[];
}

export function CodeLines({ code, lang = "ts", startLine = 1, highlight = [], annotations = {}, tone = "neutral", toneLines }: CodeLinesProps) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <pre className="m-0 min-w-max py-3 font-nv-mono text-[0.8125rem] leading-6 text-nv-ivory-100">
      <code className="block">
        {lines.map((l, i) => {
          const n = startLine + i;
          const toned = tone !== "neutral" && (!toneLines || toneLines.includes(n));
          const note = annotations[n];
          return (
            <span key={n} className="block">
              <span
                className={cn(
                  "flex px-3",
                  highlight.includes(n) && "bg-nv-copper-wash shadow-[inset_2px_0_0_var(--nv-copper-400)]",
                  toned && tone === "add" && "bg-nv-success-wash shadow-[inset_2px_0_0_var(--nv-success)]",
                  toned && tone === "remove" && "bg-nv-danger-wash shadow-[inset_2px_0_0_var(--nv-danger)]",
                )}
              >
                <span aria-hidden className="nv-num mr-4 w-8 shrink-0 select-none text-right text-nv-graphite-400">{n}</span>
                {toned ? <span className="sr-only">{tone === "add" ? "added: " : "removed: "}</span> : null}
                <span className="whitespace-pre">{highlightLine(l, lang) || " "}</span>
              </span>
              {note ? (
                <span className="my-1 ml-[3.75rem] mr-3 flex w-fit max-w-[28rem] whitespace-normal rounded-nv-xs border border-nv-copper-700 bg-white px-2 py-1 font-nv-sans text-nv-micro leading-snug text-nv-ivory-200 shadow-nv-xs">
                  <span className="sr-only">Note on line {n}: </span>
                  {note}
                </span>
              ) : null}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
