"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { GlowingBorder } from "@/components/fx/surface/glowing-border";
import { cn } from "@/components/nv/cn";

export interface Guide {
  title: string;
  href: string;
  summary: string;
  /** What the reader is trying to decide; drives the picker. */
  question: string;
}

/** Pick the question you are trying to answer; the matching guide is highlighted. All guides stay visible and linked. */
export function GuideFinder({ guides }: { guides: Guide[] }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-5">
        <h2 className="nv-display text-nv-display-md m-0">Start from your question</h2>
        <div role="radiogroup" aria-label="What are you trying to decide?" className="mt-6 grid gap-2">
          {guides.map((g, i) => (
            <button
              key={g.href}
              type="button"
              role="radio"
              aria-checked={pick === i}
              onClick={() => setPick(pick === i ? null : i)}
              className={cn(
                "min-h-14 rounded-nv-md border px-4 py-3 text-left text-nv-body transition-colors duration-200 motion-reduce:transition-none",
                pick === i ? "border-nv-copper-700 bg-nv-copper-wash text-nv-ivory-50" : "border-nv-graphite-700 bg-white text-nv-ivory-200",
              )}
            >
              {g.question}
            </button>
          ))}
        </div>
      </div>
      <ol className="m-0 grid min-w-0 list-none gap-4 p-0 lg:col-span-7">
        {guides.map((g, i) => (
          <li key={g.href}>
            <GlowingBorder className="rounded-nv-lg">
              <Link
                href={g.href}
                className={cn(
                  "nv-card group flex min-h-24 items-start gap-5 rounded-nv-lg p-6 no-underline transition-[border-color,opacity] duration-200 motion-reduce:transition-none",
                  pick === i && "border-nv-copper-700",
                  pick !== null && pick !== i && "opacity-70",
                )}
              >
                <span aria-hidden className="nv-num font-nv-serif text-4xl italic leading-none text-nv-copper-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-50">{g.title}</span>
                  <span className="mt-1.5 block text-nv-small leading-relaxed text-nv-ivory-300">{g.summary}</span>
                </span>
                <ArrowUpRight aria-hidden className="mt-1 size-5 shrink-0 text-nv-graphite-400 group-hover:text-nv-copper-400" />
              </Link>
            </GlowingBorder>
          </li>
        ))}
      </ol>
    </div>
  );
}
