"use client";

import EcosystemDiscovery from "@/components/discovery/EcosystemDiscovery";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { Page, PageHeader, btnClass } from "@/components/seo/blocks";
import s from "./TrendingClient.module.css";
import { RepoCard, TrendingStats } from "@/components/experiences/trending/TrendingParts";
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
    const [repoSort, setRepoSort] = useState("catalog");
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
    filteredRepos.sort((a, b) => repoSort === "stars" ? b.stars - a.stars : repoSort === "name" ? `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`) : 0);
    const visibleRepos = filteredRepos.slice(0, visibleCount);
    const hasMore = visibleCount < filteredRepos.length;
    const totalStars = filteredRepos.reduce((sum, repo) => sum + repo.stars, 0);
    const languageCount = new Set(filteredRepos.map((r) => r.language).filter(Boolean)).size;
    const tierLabel = TIERS.find((t) => t.id === currentTier)?.label ?? "Weekly";

    return (
        <Page wide>
            <PageHeader
                eyebrow={`Developer discovery · ${tierLabel}`}
                title="The developer ecosystem, in focus."
                lead="Find your next tool, explore the open-source ecosystem, and understand the code behind it."
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

            <EcosystemDiscovery />
            <h2 className="nv-display mb-6 text-nv-display-md">Trending GitHub repositories</h2>
            <label className="mb-6 flex items-center gap-3 text-nv-small">Repository order<select className="min-h-11 rounded-lg border border-nv-border bg-white px-3" value={repoSort} onChange={e => { setRepoSort(e.target.value); setVisibleCount(PAGE_SIZE); }}><option value="catalog">Catalog order</option><option value="stars">Most stars</option><option value="name">Name A–Z</option></select></label>
            <TrendingStats repos={filteredRepos.length} stars={totalStars} languages={languageCount} />

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
                    <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleRepos.map((repo, i) => (
                            <RepoCard key={`${repo.owner}/${repo.repo}`} repo={repo} rank={i + 1} featured={i === 0} />
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
