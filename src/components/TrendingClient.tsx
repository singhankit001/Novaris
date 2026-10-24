"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Star, ArrowUpRight } from "lucide-react";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { Page, PageHeader, btnClass } from "@/components/seo/blocks";
import s from "./TrendingClient.module.css";
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
        <Page wide>
            <PageHeader
                eyebrow={`Catalog · ${tierLabel}`}
                title="Trending repositories"
                lead="Find your next deep dive. Explore the repositories gaining momentum, then uncover how they work."
            >
                <nav aria-label="Time window" className={cn(s.seg, "mt-10")}>
                    {TIERS.map((tier) => (
                        <Link
                            key={tier.id}
                            href={`/trending?tier=${tier.id}`}
                            aria-current={currentTier === tier.id ? "page" : undefined}
                            className={cn(s.segItem, currentTier === tier.id && s.segOn)}
                        >
                            {tier.label}
                        </Link>
                    ))}
                </nav>
            </PageHeader>

            <div className={s.tools}>
                <div role="search">
                    <label htmlFor="trending-find" className="sr-only">
                        Find a repository
                    </label>
                    <div className={s.find}>
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
                        />
                    </div>
                </div>
                {languages.length > 0 && (
                    <fieldset className={s.chips}>
                        <legend className="sr-only">Language</legend>
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
                                    className={cn(s.chip, active && s.chipOn)}
                                >
                                    {lang ?? "All"}
                                </button>
                            );
                        })}
                    </fieldset>
                )}
            </div>

            <section aria-label="Results" className="min-w-0">
                <p role="status" className={cn(s.status, "nv-num")}>
                    Showing {visibleRepos.length} of {filteredRepos.length} repositories. Star counts are from the last catalog refresh.
                </p>
                {filteredRepos.length === 0 ? (
                    <EmptyState
                        title={initialRepos.length === 0 ? "The catalog has no repositories for this window" : "No repositories match"}
                        action={
                            initialRepos.length === 0 ? (
                                <Link href="/trending?tier=weekly" className={btnClass("secondary")}>
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
                    <ol className={s.table}>
                        {visibleRepos.map((repo, i) => (
                            <li key={`${repo.owner}/${repo.repo}`} className={s.rowItem}>
                                <span aria-hidden className={cn(s.rank, "nv-num")}>
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <Image src={`https://github.com/${repo.owner}.png`} alt="" width={44} height={44} className={s.avatar} />
                                <div className={s.main}>
                                    <p className={s.name}>
                                        <span className={s.owner}>{repo.owner}/</span>
                                        {repo.repo}
                                    </p>
                                    <p className={s.descr}>{repo.description || "No description in the catalog."}</p>
                                </div>
                                <span className={s.lang}>{repo.language ?? ""}</span>
                                <span className={cn(s.stars, "nv-num")}>
                                    <Star aria-hidden className="size-3.5" />
                                    {repo.stars.toLocaleString()}
                                    <span className="sr-only"> stars</span>
                                </span>
                                <Link
                                    href={`/chat?q=${encodeURIComponent(`${repo.owner}/${repo.repo}`)}`}
                                    aria-label={`Analyze ${repo.owner}/${repo.repo} with Novaris`}
                                    className={s.go}
                                >
                                    <ArrowUpRight aria-hidden className="size-4" />
                                </Link>
                                <p className={cn(s.starsM, "nv-num m-0")}>
                                    {repo.language && <span>{repo.language}</span>}
                                    <span>
                                        {repo.stars.toLocaleString()} <span className="sr-only">stars</span>
                                        <span aria-hidden>★</span>
                                    </span>
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
                {hasMore && (
                    <div className={s.more}>
                        <Button onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>Load {PAGE_SIZE} more</Button>
                    </div>
                )}
            </section>
        </Page>
    );
}
