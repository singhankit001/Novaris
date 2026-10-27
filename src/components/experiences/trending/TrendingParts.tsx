"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { CatalogRepoEntry } from "@/lib/repo-catalog";
import { cn } from "@/components/nv/cn";
import { CometCard } from "@/components/fx/surface/comet-card";
import CountUp from "../CountUp";

export function TrendingStats({ repos, stars, languages }: { repos: number; stars: number; languages: number }) {
  const items = [
    { label: "Repositories", value: repos },
    { label: "Combined stars", value: stars },
    { label: "Languages", value: languages },
  ];
  return (
    <dl className="mb-8 grid grid-cols-3 divide-x divide-nv-graphite-700 border-y border-nv-graphite-700 py-5">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-3 first:pl-0 sm:px-6">
          <dd className="order-1 m-0 font-nv-serif text-[clamp(1.5rem,1rem+2.4vw,2.75rem)] italic leading-none text-nv-ivory-50">
            <CountUp value={it.value} className="nv-num" />
          </dd>
          <dt className="mt-2 text-nv-micro text-nv-ivory-300">{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function RepoCard({ repo, rank, featured }: { repo: CatalogRepoEntry; rank: number; featured: boolean }) {
  const topics = repo.topics.slice(0, 4);
  return (
    <li className={cn("min-w-0", featured && "lg:col-span-2")}>
      <CometCard tilt={5} className="h-full [&>div]:h-full">
        <div className={cn("relative flex h-full flex-col gap-4 p-5", featured && "sm:p-7")}>
          <div className="flex items-start gap-4">
            <Image src={`https://github.com/${repo.owner}.png`} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl border border-nv-graphite-700 bg-nv-graphite-850" />
            <div className="min-w-0 flex-1">
              <p className="m-0 break-words text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-50">
                <span className="font-normal text-nv-ivory-300">{repo.owner}/</span>
                {repo.repo}
              </p>
              <p className="nv-num m-0 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-nv-micro text-nv-ivory-200">
                <span className="font-nv-serif text-base italic text-nv-copper-600">#{String(rank).padStart(2, "0")}</span>
                <span className="inline-flex items-center gap-1.5 text-nv-small font-medium text-nv-ivory-50">
                  <Star aria-hidden className="size-3.5" />
                  <CountUp value={repo.stars} />
                  <span className="sr-only"> stars</span>
                </span>
                {repo.language ? <span className="font-nv-mono">{repo.language}</span> : null}
              </p>
            </div>
          </div>
          <p className={cn("m-0 text-nv-small leading-relaxed text-nv-ivory-200 [-webkit-box-orient:vertical] [display:-webkit-box] overflow-hidden", featured ? "[-webkit-line-clamp:3]" : "[-webkit-line-clamp:2]")}>
            {repo.description || "No description in the catalog."}
          </p>
          <a href={`https://github.com/${repo.owner}/${repo.repo}`} target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex min-h-11 items-center gap-2 text-nv-small text-nv-copper-400 hover:underline">View on GitHub <ArrowUpRight size={14} aria-hidden /></a>
          <div className="mt-auto flex items-end justify-between gap-3">
            <ul
              aria-label="Topics"
              className="m-0 flex min-h-7 min-w-0 list-none flex-wrap gap-1.5 p-0 transition-opacity duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-focus-within/comet:opacity-100 group-hover/comet:opacity-100 motion-reduce:transition-none"
            >
              {topics.map((t) => (
                <li key={t} className="rounded-full border border-nv-graphite-700 px-2.5 py-0.5 font-nv-mono text-nv-micro text-nv-ivory-200">
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href={`/chat?q=${encodeURIComponent(`${repo.owner}/${repo.repo}`)}`}
              aria-label={`Analyze ${repo.owner}/${repo.repo} with Novaris`}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-nv-border bg-white text-nv-ivory-200 transition-colors hover:border-nv-copper-500 hover:bg-nv-copper-500 hover:text-white"
            >
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </CometCard>
    </li>
  );
}
