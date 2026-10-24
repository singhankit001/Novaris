"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Star, ArrowUpRight } from "lucide-react";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { buttonClasses } from "@/components/nv/button-styles";
import { Button } from "@/components/nv/button";
import { EmptyState } from "@/components/nv/states";
import { cn } from "@/components/nv/cn";

type Tier = "weekly" | "monthly" | "yearly" | "all-time";

interface TrendingClientProps {
    initialRepos: CatalogRepoEntry[];
    currentTier: Tier;
}

const TIERS: { id: Tier; label: string }[] = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
    { id: "all-time", label: "All time" },
];

const PAGE_SIZE = 50;

export default function TrendingClient({ initialRepos, currentTier }: TrendingClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const languages = Array.from(new Set(initialRepos.map((r) => r.language).filter((l): l is string => Boolean(l)))).sort();

    const needle = searchQuery.trim().toLowerCase();
    const filteredRepos = initialRepos.filter((repo) => {
        const matchesSearch =
            !needle ||
            repo.repo.toLowerCase().includes(needle) ||
            repo.owner.toLowerCase().includes(needle) ||
            Boolean(repo.description?.toLowerCase().includes(needle));
        return matchesSearch && (!selectedLanguage || repo.language === selectedLanguage);
    });
    const visibleRepos = filteredRepos.slice(0, visibleCount);
    const hasMore = visibleCount < filteredRepos.length;
    const tierLabel = TIERS.find((t) => t.id === currentTier)?.label ?? "Weekly";

    return (
        <div className="mx-auto w-full max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] py-10 md:py-20">
            <header className="mb-12">
                <p className="nv-eyebrow mb-4">Catalog · {tierLabel}</p>
                <h1 className="nv-display text-nv-display-lg text-balance text-nv-ivory-50">Trending repositories</h1>
                <p className="mt-5 max-w-[var(--nv-measure)] text-pretty text-nv-title leading-snug text-nv-ivory-200">
                    Find your next deep dive. Explore the repositories gaining momentum, then uncover how they work.
                </p>
                <nav aria-label="Time window" className="mt-6 flex flex-wrap gap-2">
                    {TIERS.map((tier) => (
                        <Link
                            key={tier.id}
                            href={`/trending?tier=${tier.id}`}
                            aria-current={currentTier === tier.id ? "page" : undefined}
                            className={cn(
                                buttonClasses(currentTier === tier.id ? "primary" : "secondary"),
                            )}
                        >
                            {tier.label}
                        </Link>
                    ))}
                </nav>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
                <aside aria-label="Filters" className="rounded-nv-lg border border-nv-graphite-600 bg-nv-graphite-800 p-5 lg:sticky lg:top-24 lg:col-span-3 lg:self-start">
                    <label htmlFor="trending-find" className="nv-eyebrow mb-2 block">
                        Find a repository
                    </label>
                    <div className="flex min-h-11 items-center gap-2 rounded-nv-sm border border-nv-graphite-500 bg-nv-graphite-850 px-3 focus-within:border-nv-copper-400">
                        <Search aria-hidden className="size-4 shrink-0 text-nv-ivory-300" />
                        <input
                            id="trending-find"
                            type="search"
                            placeholder="Name, owner or description"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setVisibleCount(PAGE_SIZE);
                            }}
                            className="min-h-11 w-full border-0 bg-transparent text-nv-body text-nv-ivory-50 outline-none placeholder:text-nv-graphite-400 focus-visible:!shadow-none focus-visible:!outline-none"
                        />
                    </div>
                    {languages.length > 0 && (
                        <fieldset className="mt-6 min-w-0 border-0 p-0">
                            <legend className="nv-eyebrow mb-2">Language</legend>
                            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
                                {[null, ...languages.slice(0, 12)].map((lang) => {
                                    const active = selectedLanguage === lang;
                                    return (
                                        <button
                                            key={lang ?? "all"}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => {
                                                setSelectedLanguage(lang);
                                                setVisibleCount(PAGE_SIZE);
                                            }}
                                            className={cn(
                                                "min-h-11 shrink-0 touch-manipulation rounded-nv-sm border px-3 text-nv-small transition-colors duration-150",
                                                active
                                                    ? "border-nv-copper-400 bg-nv-copper-wash text-nv-copper-300"
                                                    : "border-nv-graphite-600 text-nv-ivory-200 hover:border-nv-graphite-500 hover:text-nv-ivory-50",
                                            )}
                                        >
                                            {lang ?? "All"}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    )}
                </aside>

                <section aria-label="Results" className="min-w-0 lg:col-span-9">
                    <p role="status" className="nv-num mb-3 text-nv-small text-nv-ivory-300">
                        Showing {visibleRepos.length} of {filteredRepos.length} repositories. Star counts are from the last catalog refresh.
                    </p>
                    {filteredRepos.length === 0 ? (
                        <EmptyState
                            title={initialRepos.length === 0 ? "The catalog has no repositories for this window" : "No repositories match"}
                            action={
                                initialRepos.length === 0 ? (
                                    <Link href="/trending?tier=weekly" className={buttonClasses("secondary")}>
                                        Try the weekly list
                                    </Link>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedLanguage(null);
                                        }}
                                    >
                                        Reset filters
                                    </Button>
                                )
                            }
                        >
                            <p>{initialRepos.length === 0 ? "The catalog may be refreshing. Search for any repository from the home page instead." : "Change the search text or language."}</p>
                        </EmptyState>
                    ) : (
                        <ul className="m-0 list-none overflow-hidden rounded-nv-lg border border-nv-graphite-600 bg-nv-graphite-800 p-0">
                            {visibleRepos.map((repo) => (
                                <li key={`${repo.owner}/${repo.repo}`} className="group flex flex-wrap items-center gap-4 border-b border-nv-graphite-600 px-5 py-5 transition-colors last:border-b-0 hover:bg-nv-graphite-850 sm:flex-nowrap">
                                    <Image
                                        src={`https://github.com/${repo.owner}.png`}
                                        alt=""
                                        width={44}
                                        height={44}
                                        className="hidden size-11 shrink-0 rounded-nv-sm bg-nv-graphite-800 sm:block"
                                    />
                                    <div className="min-w-0 flex-1 basis-1/2">
                                        <p className="truncate text-nv-body font-semibold text-nv-ivory-50">
                                            <span className="text-nv-ivory-300">{repo.owner}/</span>
                                            {repo.repo}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-nv-small text-nv-ivory-300">{repo.description || "No description in the catalog."}</p>
                                        <p className="nv-num mt-1 flex flex-wrap items-center gap-x-4 text-nv-micro text-nv-ivory-300">
                                            {repo.language && <span>{repo.language}</span>}
                                            <span className="inline-flex items-center gap-1">
                                                <Star aria-hidden className="size-3" />
                                                {repo.stars.toLocaleString()}
                                                <span className="sr-only"> stars</span>
                                            </span>
                                        </p>
                                    </div>
                                    <Link
                                        href={`/chat?q=${encodeURIComponent(`${repo.owner}/${repo.repo}`)}`}
                                        aria-label={`Analyze ${repo.owner}/${repo.repo} with Novaris`}
                                        className={buttonClasses("secondary")}
                                    >
                                        Analyze <ArrowUpRight aria-hidden className="size-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {hasMore && (
                        <div className="mt-8">
                            <Button onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>Load {PAGE_SIZE} more</Button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
