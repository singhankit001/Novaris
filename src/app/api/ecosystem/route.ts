import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { ecosystem, type EcosystemMetrics } from '@/lib/ecosystem';

const loadMetrics = unstable_cache(async () => {
  const repos = [...new Set(ecosystem.flatMap(e => e.repo ? [e.repo] : []))];
  const metrics: EcosystemMetrics = {};
  // Limit upstream concurrency; never accept arbitrary client-supplied repositories.
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < repos.length) {
      const repo = repos[cursor++];
      try {
        const token = process.env.NOVARIS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: AbortSignal.timeout(5000), cache: 'no-store',
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (typeof data.stargazers_count !== 'number' || typeof data.forks_count !== 'number' || !data.pushed_at) continue;
        metrics[repo] = { stars: data.stargazers_count, forks: data.forks_count, pushedAt: data.pushed_at, archived: Boolean(data.archived), fetchedAt: new Date().toISOString() };
      } catch { /* Partial failure leaves the source links usable without invented metrics. */ }
    }
  }));
  return metrics;
}, ['ecosystem-metrics-v1'], { revalidate: 3600 });

export async function GET() {
  const metrics = await loadMetrics();
  return NextResponse.json({ metrics }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
