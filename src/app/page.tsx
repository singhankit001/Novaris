import { Suspense } from "react";
import { Metadata } from "next";
import HomeClient from "./HomeClient";
import { getHomepagePosts } from "@/lib/services/blog-service";
import { getCuratedRepos, type CatalogRepoEntry } from "@/lib/repo-catalog";
import { getPublicStats } from "@/lib/analytics";
import { MAX_TOKENS } from "@/lib/tokens";
import { SECURITY_SCAN_FILE_LIMITS } from "@/lib/security-scan-config";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";

export const revalidate = 300;
const HOMEPAGE_TRENDING_REPO_LIMIT = 60;
// Homepage examples and search suggestions only show widely known repositories.
const HOMEPAGE_MIN_STARS = 10_000;

/** Famous repos from the tier first, then this year's most-starred risers, deduped. */
function famousRepos(tierRepos: CatalogRepoEntry[], risers: CatalogRepoEntry[]): CatalogRepoEntry[] {
    const seen = new Set<string>();
    return [...tierRepos.filter((r) => r.stars >= HOMEPAGE_MIN_STARS).sort((a, b) => b.stars - a.stars), ...risers]
        .filter((r) => {
            const key = `${r.owner}/${r.repo}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, HOMEPAGE_TRENDING_REPO_LIMIT);
}

export const metadata: Metadata = createSeoMetadata({
    title: "GitHub Repository Analysis, Code Review & Security Scanning",
    description:
        "Analyze GitHub repositories and developer profiles with Agentic AI. Use Novaris for architecture visualization, AI code review, and repository security scanning.",
    keywords: [
        "github repository analysis",
        "ai code review tool",
        "repository security scanner",
        "github code analyzer",
        "repository risk analysis",
    ],
    canonical: "/",
    ogImage: buildOgImageUrl("marketing", { variant: "home" }),
    ogTitle: "GitHub Repository Analysis, Code Review & Security Scanning | Novaris",
    ogDescription: "Understand architecture, review code with context, and prioritize repository security risks faster.",
});

export default async function Home() {
    const [latestPosts, weekly, monthly, yearly, publicStats] = await Promise.all([
        getHomepagePosts(),
        getCuratedRepos("weekly"),
        getCuratedRepos("monthly"),
        getCuratedRepos("yearly"),
        getPublicStats(),
    ]);
    const risers = yearly
        .filter((r) => r.stars >= HOMEPAGE_MIN_STARS)
        .sort((a, b) => b.stars - a.stars);
    const weeklyTrending = famousRepos(weekly, risers);
    const monthlyTrending = famousRepos(monthly, risers);

    return (
        <Suspense fallback={null}>
            <HomeClient 
                initialPosts={latestPosts} 
                weeklyTrending={weeklyTrending} 
                monthlyTrending={monthlyTrending}
                publicStats={publicStats}
                limits={{ contextTokens: MAX_TOKENS, deepScanFiles: SECURITY_SCAN_FILE_LIMITS.deep, quickScanFiles: SECURITY_SCAN_FILE_LIMITS.quick }}
            />
        </Suspense>
    );
}
