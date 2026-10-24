"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { getRecentSearches } from "./actions";
import RepoSearch from "@/components/RepoSearch";
import PublicStats from "@/components/PublicStats";
import { WhatsNewBadge } from "@/components/WhatsNewBadge";
import SiteChrome from "@/components/seo/SiteChrome";
import { Notice } from "@/components/nv/notice";
import { BasisTag } from "@/components/nv/badge";
import { Citation } from "@/components/nv/evidence";
import { FaqList } from "@/components/seo/blocks";
import JsonLdScript from "@/components/JsonLdScript";
import type { SearchHistoryItem } from "@/lib/services/history-service";
import { INVALID_SESSION_ERROR_PARAM } from "@/lib/session-guard";
import { BlogPost } from "@prisma/client";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { FAQ_PAGE_ITEMS } from "@/lib/faq-data";
import { normalizeGitHubInput } from "@/lib/utils";
import { buildFaqStructuredData, buildSoftwareApplicationStructuredData } from "@/lib/structured-data";

const InstallPWA = dynamic(() => import("@/components/InstallPWA").then((mod) => mod.InstallPWA), { ssr: false });

type PublicStatsData = {
    totalVisitors: number;
    totalQueries: number;
    totalScans: number;
};

/**
 * Static, clearly illustrative poster for the Phase 4 repository atlas. The 3D component replaces
 * the contents of the slot. Strata are module layers; copper lines are example evidence edges.
 */
function AtlasPoster() {
    const layers = [
        { y: 28, label: "app/", files: [34, 22, 46, 18] },
        { y: 92, label: "components/", files: [26, 40, 20, 32, 16] },
        { y: 156, label: "lib/", files: [44, 24, 30] },
        { y: 220, label: "prisma/", files: [38, 28] },
    ];
    return (
        <figure className="m-0">
            <div data-atlas-slot="landing" aria-hidden="true" className="relative">
                <svg viewBox="0 0 440 300" className="h-auto w-full" role="presentation" focusable="false">
                    {layers.map((l) => (
                        <g key={l.label}>
                            <rect x="8" y={l.y} width="424" height="52" fill="var(--nv-graphite-900)" stroke="var(--nv-graphite-700)" />
                            <text x="18" y={l.y + 16} fill="var(--nv-ivory-300)" fontFamily="var(--nv-font-mono)" fontSize="10">
                                {l.label}
                            </text>
                            {l.files.map((w, i) => {
                                const x = 120 + l.files.slice(0, i).reduce((a, b) => a + b + 14, 0);
                                return <rect key={i} x={x} y={l.y + 12} width={w * 3} height="28" fill="var(--nv-graphite-800)" stroke="var(--nv-graphite-600)" />;
                            })}
                        </g>
                    ))}
                    <g fill="none" stroke="var(--nv-copper-400)" strokeWidth="1.5">
                        <path d="M170 54 C 170 86, 150 90, 150 104" />
                        <path d="M260 118 C 260 140, 200 140, 200 168" />
                        <path d="M200 182 C 200 210, 160 210, 160 234" />
                        <path d="M330 54 C 330 90, 300 100, 300 104" />
                    </g>
                    <g fill="var(--nv-copper-400)">
                        <circle cx="170" cy="54" r="3" />
                        <circle cx="150" cy="104" r="3" />
                        <circle cx="260" cy="118" r="3" />
                        <circle cx="200" cy="168" r="3" />
                        <circle cx="160" cy="234" r="3" />
                    </g>
                </svg>
            </div>
            <figcaption className="mt-3 text-nv-micro text-nv-ivory-300">
                <span className="nv-eyebrow mr-2">Illustrative</span>
                Layers are modules, copper lines are imports. In a real result each line links to a file and line range.
            </figcaption>
        </figure>
    );
}

const FACTS: { term: string; detail: string }[] = [
    { term: "What it reads", detail: "Public GitHub data through the GitHub API: the file tree, the files chosen for your question, commit and language metadata." },
    { term: "What it sends to Gemini", detail: "Those selected files and your question, so the model can answer. Nothing else leaves GitHub's data." },
    { term: "Limits", detail: "Each question has a file budget. Deep security scans need sign-in. Reports are kept for 7 days." },
    { term: "What it does not do", detail: "No cloning or running code, no developer rankings or scores. Private repositories only with the access you grant." },
];

export default function HomeClient({
    initialPosts = [],
    weeklyTrending = [],
    monthlyTrending = [],
    publicStats,
}: {
    initialPosts?: BlogPost[];
    weeklyTrending?: CatalogRepoEntry[];
    monthlyTrending?: CatalogRepoEntry[];
    publicStats: PublicStatsData;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
    const hasInvalidSessionError = searchParams.get("error") === INVALID_SESSION_ERROR_PARAM;

    const [trendingTier, setTrendingTier] = useState<"weekly" | "monthly">("weekly");
    const trendingRepos = trendingTier === "weekly" ? weeklyTrending : monthlyTrending;
    const visibleRepos = trendingRepos.slice(0, 6);
    const softwareSchema = buildSoftwareApplicationStructuredData({
        name: "Novaris",
        description:
            "Novaris helps developers analyze GitHub repositories for architecture understanding, AI code review, and security scanning.",
        path: "/",
        featureList: [
            "GitHub repository analysis",
            "Architecture mapping",
            "AI code review workflow",
            "Repository security scanning",
        ],
    });
    const faqSchema = buildFaqStructuredData(FAQ_PAGE_ITEMS);

    useEffect(() => {
        if (session) {
            getRecentSearches().then(setRecentSearches);
        }
    }, [session]);

    const handleSearch = async (query: string) => {
        const normalizedInput = normalizeGitHubInput(query);
        if (!normalizedInput) return;

        setLoading(true);
        setError("");

        try {
            router.push(`/chat?q=${encodeURIComponent(normalizedInput)}`);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <SiteChrome>
            <div className="mx-auto w-full max-w-[var(--nv-page-max)] px-[var(--nv-gutter)]">
                <section aria-labelledby="home-h" className="grid grid-cols-1 gap-10 py-12 md:py-20 lg:grid-cols-12 lg:gap-12">
                    <div className="lg:col-span-7">
                        <p className="nv-eyebrow mb-5 flex flex-wrap items-center gap-x-3">
                            Public repositories and profiles
                            <WhatsNewBadge />
                        </p>
                        <h1 id="home-h" className="nv-display text-nv-display-xl text-balance text-nv-ivory-50">
                            Read a repository. See which files back each answer.
                        </h1>
                        <p className="mt-6 max-w-[var(--nv-measure)] text-pretty text-nv-title leading-snug text-nv-ivory-200">
                            Paste a GitHub URL, a username, or owner/repo. Novaris loads the relevant files and answers questions about architecture, code, and security, with the sources shown.
                        </p>

                        {hasInvalidSessionError && (
                            <Notice tone="warning" title="Your session could not be validated" className="mt-6 max-w-xl">
                                Sign in again to continue.
                            </Notice>
                        )}

                        <div className="mt-8 max-w-2xl">
                            <RepoSearch
                                onSearchSubmit={handleSearch}
                                loading={loading}
                                trendingRepos={weeklyTrending}
                                recentSearches={recentSearches}
                                isSessionActive={!!session}
                            />
                            {error && (
                                <p role="alert" className="mt-3 text-nv-small text-nv-danger">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 lg:mt-24">
                        <AtlasPoster />
                    </div>
                </section>

                <section aria-labelledby="facts-h" className="grid grid-cols-1 gap-6 border-t border-nv-graphite-700 py-12 lg:grid-cols-12 lg:gap-12">
                    <h2 id="facts-h" className="nv-display text-nv-display-md text-balance text-nv-ivory-50 lg:col-span-4">
                        What happens to your request
                    </h2>
                    <dl className="m-0 lg:col-span-8">
                        {FACTS.map((f) => (
                            <div key={f.term} className="grid gap-1 border-b border-nv-graphite-700 py-4 first:pt-0 md:grid-cols-[12rem_1fr] md:gap-8">
                                <dt className="nv-eyebrow pt-1">{f.term}</dt>
                                <dd className="m-0 max-w-[var(--nv-measure)] text-pretty text-nv-body text-nv-ivory-200">{f.detail}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section aria-labelledby="sourced-h" className="grid grid-cols-1 gap-6 border-t border-nv-graphite-700 py-12 lg:grid-cols-12 lg:gap-12">
                    <div className="lg:col-span-4">
                        <h2 id="sourced-h" className="nv-display text-nv-display-md text-balance text-nv-ivory-50">
                            How a claim is sourced
                        </h2>
                        <p className="mt-3 text-nv-small text-nv-ivory-300">Sample layout with made-up values, not a real result.</p>
                    </div>
                    <ol className="m-0 list-none divide-y divide-nv-graphite-700 border-y border-nv-graphite-700 p-0 lg:col-span-8">
                        {[
                            { claim: "Requests pass through a single auth middleware.", basis: "measured" as const, cite: "src/middleware.ts", lines: "12-40" },
                            { claim: "The retry policy probably protects against rate limits.", basis: "inferred" as const, cite: "src/lib/http.ts", lines: "55-71" },
                            { claim: "Test coverage for this module.", basis: "unknown" as const },
                        ].map((row) => (
                            <li key={row.claim} className="grid items-center gap-2 py-4 md:grid-cols-[1fr_auto_auto] md:gap-6">
                                <span className="text-pretty text-nv-body text-nv-ivory-100">{row.claim}</span>
                                <BasisTag basis={row.basis} />
                                {row.cite ? <Citation kind="file" target={row.cite} lines={row.lines} /> : <span className="text-nv-small text-nv-ivory-300">No source</span>}
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="border-t border-nv-graphite-700 py-12">
                    <PublicStats stats={publicStats} />
                </div>

                {trendingRepos.length > 0 && (
                    <section id="trending-section" aria-labelledby="trend-h" className="grid grid-cols-1 gap-6 border-t border-nv-graphite-700 py-12 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-4">
                            <h2 id="trend-h" className="nv-display text-nv-display-md text-balance text-nv-ivory-50">
                                Trending in the catalog
                            </h2>
                            <div role="group" aria-label="Time window" className="mt-4 flex gap-2">
                                {(["weekly", "monthly"] as const).map((tier) => (
                                    <button
                                        key={tier}
                                        type="button"
                                        aria-pressed={trendingTier === tier}
                                        onClick={() => setTrendingTier(tier)}
                                        className={`min-h-11 rounded-nv-sm border px-4 text-nv-small capitalize transition-colors duration-150 ${
                                            trendingTier === tier ? "border-nv-copper-400 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-600 text-nv-ivory-200 hover:border-nv-graphite-500"
                                        }`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-8">
                            <ul className="m-0 list-none border-t border-nv-graphite-700 p-0">
                                {visibleRepos.map((repo) => (
                                    <li key={`${repo.owner}/${repo.repo}`}>
                                        <Link
                                            href={`/chat?q=${encodeURIComponent(`${repo.owner}/${repo.repo}`)}`}
                                            aria-label={`Analyze ${repo.owner}/${repo.repo} with Novaris`}
                                            className="group flex min-h-14 items-center justify-between gap-4 border-b border-nv-graphite-700 px-1 py-3 hover:bg-nv-graphite-900"
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-mono text-nv-body text-nv-ivory-50 group-hover:text-nv-copper-300">
                                                    {repo.owner}/{repo.repo}
                                                </span>
                                                <span className="block truncate text-nv-small text-nv-ivory-300">{repo.description || "No description in the catalog."}</span>
                                            </span>
                                            <span className="nv-num shrink-0 text-nv-small text-nv-ivory-300">
                                                {repo.stars.toLocaleString()} <span className="sr-only">stars</span>
                                                <span aria-hidden>★</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/trending" className="mt-4 inline-flex min-h-11 items-center gap-1 text-nv-small text-nv-copper-400 hover:text-nv-copper-300">
                                All trending repositories <ArrowUpRight aria-hidden className="size-4" />
                            </Link>
                        </div>
                    </section>
                )}

                {initialPosts.length > 0 && (
                    <section aria-labelledby="posts-h" className="grid grid-cols-1 gap-6 border-t border-nv-graphite-700 py-12 lg:grid-cols-12 lg:gap-12">
                        <h2 id="posts-h" className="nv-display text-nv-display-md text-balance text-nv-ivory-50 lg:col-span-4">
                            Latest insights
                        </h2>
                        <div className="lg:col-span-8">
                            <ul className="m-0 list-none border-t border-nv-graphite-700 p-0">
                                {initialPosts.map((post) => (
                                    <li key={post.slug}>
                                        <Link href={`/blog/${post.slug}`} className="group block border-b border-nv-graphite-700 px-1 py-4 hover:bg-nv-graphite-900">
                                            <span className="nv-eyebrow nv-num block">
                                                {post.date} · {post.category}
                                            </span>
                                            <span className="mt-1 block text-nv-title font-medium text-nv-ivory-50 group-hover:text-nv-copper-300">{post.title}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/blog" className="mt-4 inline-flex min-h-11 items-center gap-1 text-nv-small text-nv-copper-400 hover:text-nv-copper-300">
                                All insights <ArrowUpRight aria-hidden className="size-4" />
                            </Link>
                        </div>
                    </section>
                )}

                <section aria-labelledby="faq-h" className="grid grid-cols-1 gap-6 border-t border-nv-graphite-700 py-12 lg:grid-cols-12 lg:gap-12">
                    <h2 id="faq-h" className="nv-display text-nv-display-md text-balance text-nv-ivory-50 lg:col-span-4">
                        Frequently asked questions
                    </h2>
                    <div className="lg:col-span-8">
                        <FaqList items={FAQ_PAGE_ITEMS} />
                    </div>
                </section>
            </div>
            <JsonLdScript data={softwareSchema} />
            <JsonLdScript data={faqSchema} />
            <InstallPWA />
        </SiteChrome>
    );
}
