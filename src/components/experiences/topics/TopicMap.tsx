"use client";

import Link from "next/link";
import { useRef, type RefObject } from "react";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";

export interface TopicLanguage {
  name: string;
  count: number;
}

export interface TopicLink {
  slug: string;
  label: string;
}

interface TopicMapProps {
  topic: string;
  repoCount: number;
  totalStars: number;
  /** Languages present in the topic's repositories, most common first (max 4 shown). */
  languages: TopicLanguage[];
  /** Other indexable topics that these repositories also carry. */
  related: TopicLink[];
}

/** Compact map of how the topic's repositories split by language, drawn from the catalog rows on this page. */
export function TopicMap({ topic, repoCount, totalStars, languages, related }: TopicMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLLIElement>(null);
  const r1 = useRef<HTMLLIElement>(null);
  const r2 = useRef<HTMLLIElement>(null);
  const r3 = useRef<HTMLLIElement>(null);
  const refs: RefObject<HTMLLIElement | null>[] = [r0, r1, r2, r3];
  const shown = languages.slice(0, 4);

  return (
    <aside aria-label={`${topic} repositories by language`} className="min-w-0">
      <h2 className="nv-eyebrow m-0">Languages in this topic</h2>
      {shown.length > 0 ? (
        <div ref={box} className="relative mt-4 flex items-center justify-between gap-6 overflow-hidden rounded-nv-lg border border-nv-graphite-700 bg-white p-4">
          <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
            {shown.map((l, i) => (
              <li key={l.name} ref={refs[i]} className="z-10 min-w-0 rounded-nv-md border border-nv-graphite-600 bg-white px-3 py-2">
                <span className="block truncate text-nv-small font-medium text-nv-ivory-100">{l.name}</span>
                <span className="nv-num block text-nv-micro text-nv-ivory-300">
                  {l.count} {l.count === 1 ? "repo" : "repos"}
                </span>
              </li>
            ))}
          </ul>
          <div ref={hub} className="z-10 flex min-w-0 max-w-[45%] flex-col items-center rounded-nv-lg border border-nv-copper-700 bg-nv-copper-wash px-3 py-4 text-center">
            <span className="block max-w-full break-words text-nv-small font-semibold text-nv-ivory-50">{topic}</span>
            <span className="nv-num mt-1 block text-nv-micro text-nv-ivory-200">{repoCount} repos</span>
            <span className="nv-num block text-nv-micro text-nv-ivory-200">{totalStars.toLocaleString("en-US")} stars</span>
          </div>
          {shown.map((l, i) => (
            <AnimatedBeam key={l.name} containerRef={box} fromRef={refs[i] ?? r0} toRef={hub} curvature={(i - (shown.length - 1) / 2) * 18} delay={i * 0.35} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-nv-small text-nv-ivory-300">The catalog lists no language for these repositories.</p>
      )}
      {related.length > 0 ? (
        <>
          <h2 className="nv-eyebrow m-0 mt-8">Often tagged with</h2>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/topics/${r.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-nv-hairline bg-white px-4 text-nv-micro text-nv-ivory-200 hover:border-nv-copper-700 hover:text-nv-ivory-50">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
