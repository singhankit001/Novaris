import { Suspense } from 'react';
import { Metadata } from 'next';
import { getCuratedRepos } from '@/lib/repo-catalog';
import TrendingClient from '@/components/TrendingClient';
import SiteChrome from '@/components/seo/SiteChrome';
import { buildOgImageUrl, createSeoMetadata } from '@/lib/seo';

export const metadata: Metadata = createSeoMetadata({
  title: "Trending Repositories",
  description: "Explore this week's most trending GitHub repositories. Analyze them instantly with Novaris's AI-driven intelligence.",
  canonical: '/trending',
  keywords: ["trending github repos", "popular repositories", "github trends", "trending code", "repo analysis"],
  ogImage: buildOgImageUrl("marketing", { variant: "trending" }),
  ogTitle: "Trending GitHub repositories",
  ogDescription: "Explore the projects getting the most heat on GitHub this week.",
});

const TIERS = ['weekly', 'monthly', 'yearly', 'all-time'] as const;
type Tier = (typeof TIERS)[number];

export default async function TrendingPage({
    searchParams
}: {
    searchParams: Promise<{ tier?: string }>
}) {
    const { tier: tierParam } = await searchParams;
    // The query string is untrusted: fall back to weekly for anything outside the supported windows.
    const tier: Tier = TIERS.find((t) => t === tierParam) ?? 'weekly';
    const trendingRepos = await getCuratedRepos(tier);

    return (
        <SiteChrome current="/trending">
            <Suspense fallback={null}>
                <TrendingClient initialRepos={trendingRepos} currentTier={tier} />
            </Suspense>
        </SiteChrome>
    );
}
