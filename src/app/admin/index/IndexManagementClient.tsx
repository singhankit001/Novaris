"use client";

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { CatalogRepoEntry, RepoTier } from "@/lib/repo-catalog";
import { Badge } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { Metric, MetricGroup, DataTable, type Column } from "@/components/nv/data";
import { Input } from "@/components/nv/field";
import { Notice } from "@/components/nv/notice";
import { Tabs } from "@/components/nv/tabs";
import { refreshCatalogAction } from "./actions";

interface Props {
  repos: CatalogRepoEntry[];
  topics: string[];
  stats: {
    totalRepos: number;
    totalTopics: number;
    tierCounts: Record<string, number>;
  };
}

const LIMIT = 500;

const columns: Column<CatalogRepoEntry>[] = [
  { key: "rank", header: "Rank", numeric: true, render: (r) => (r.rank ? `#${r.rank}` : "n/a") },
  {
    key: "repo",
    header: "Repository",
    render: (r) => (
      <span className="flex max-w-xs flex-col">
        <Link href={`/chat?q=${encodeURIComponent(`${r.owner}/${r.repo}`)}`} className="text-nv-copper-300 hover:underline">
          {r.owner}/{r.repo}
        </Link>
        <span className="truncate text-nv-micro text-nv-ivory-300">{r.description}</span>
      </span>
    ),
  },
  { key: "tier", header: "Tier", render: (r) => <Badge>{r.tier ?? "none"}</Badge> },
  { key: "trend", header: "Trending score", numeric: true, render: (r) => (r.trendingScore ? r.trendingScore.toFixed(1) : "n/a") },
  { key: "stars", header: "Stars", numeric: true, render: (r) => r.stars.toLocaleString() },
  { key: "lang", header: "Language", render: (r) => r.language || "n/a" },
];

export default function IndexManagementClient({ repos, topics, stats }: Props) {
  const [repoSearch, setRepoSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<RepoTier | "all">("all");
  const [refresh, setRefresh] = useState<{ state: "idle" | "running" | "ok" | "error"; message?: string }>({ state: "idle" });

  const q = repoSearch.toLowerCase();
  const matchingRepos = repos.filter((repo) => {
    const matchesSearch = `${repo.owner}/${repo.repo}`.toLowerCase().includes(q) || (repo.description || "").toLowerCase().includes(q);
    return matchesSearch && (selectedTier === "all" || repo.tier === selectedTier);
  });
  const filteredRepos = matchingRepos.slice(0, LIMIT);
  const matchingTopics = topics.filter((topic) => topic.toLowerCase().includes(topicSearch.toLowerCase()));
  const filteredTopics = matchingTopics.slice(0, LIMIT);

  async function handleRefresh() {
    setRefresh({ state: "running" });
    try {
      await refreshCatalogAction();
      setRefresh({ state: "ok" });
    } catch (error) {
      setRefresh({ state: "error", message: error instanceof Error ? error.message : "The refresh failed." });
    }
  }

  const reposPanel = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input label="Search repositories" leading={<Search className="size-4" />} value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)} placeholder="Repo, owner or description" type="search" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tier" className="text-nv-small font-medium text-nv-ivory-200">
            Tier
          </label>
          <select
            id="tier"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as RepoTier | "all")}
            className="min-h-11 rounded-nv-sm border border-nv-graphite-500 bg-nv-graphite-850 px-3 text-nv-body text-nv-ivory-100"
          >
            <option value="all">All tiers</option>
            <option value="all-time">All-time</option>
            <option value="yearly">Yearly</option>
            <option value="6-month">6-month</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      <DataTable caption="Curated repositories" columns={columns} rows={filteredRepos} rowKey={(r) => `${r.owner}/${r.repo}`} empty="No repositories match this filter." />
      {matchingRepos.length > LIMIT && <p className="m-0 text-nv-small text-nv-ivory-300">Showing the first {LIMIT} of {matchingRepos.length.toLocaleString()} matches. Narrow the search to see others.</p>}
    </div>
  );

  const topicsPanel = (
    <div className="space-y-4">
      <Input label="Search topics" leading={<Search className="size-4" />} value={topicSearch} onChange={(e) => setTopicSearch(e.target.value)} placeholder="Topic name" type="search" />
      {filteredTopics.length === 0 ? (
        <p className="m-0 text-nv-ivory-300">No topics match this search.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {filteredTopics.map((topic) => (
            <li key={topic}>
              <Link href={`/topics/${encodeURIComponent(topic)}`} className="flex min-h-11 items-center rounded-nv-sm border border-nv-graphite-700 px-3 text-nv-small text-nv-ivory-100 hover:bg-nv-graphite-850">
                {topic}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {matchingTopics.length > LIMIT && <p className="m-0 text-nv-small text-nv-ivory-300">Showing the first {LIMIT} of {matchingTopics.length.toLocaleString()} matches.</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <MetricGroup className="flex-1 md:grid-cols-5">
          {(Object.entries(stats.tierCounts) as [RepoTier, number][]).map(([tier, count]) => (
            <Metric key={tier} label={tier} value={count.toLocaleString()} source="catalog tier count" />
          ))}
        </MetricGroup>
        <Button leading={<RefreshCw aria-hidden className="size-4" />} loading={refresh.state === "running"} onClick={handleRefresh}>
          Refresh cache
        </Button>
      </div>
      {refresh.state === "ok" && <Notice tone="success" title="Catalog cache refreshed" />}
      {refresh.state === "error" && (
        <Notice tone="danger" title="Cache refresh failed">
          {refresh.message}
        </Notice>
      )}
      <Tabs
        label="Catalog"
        items={[
          { id: "repos", label: "Repositories", count: stats.totalRepos, panel: reposPanel },
          { id: "topics", label: "Topics", count: stats.totalTopics, panel: topicsPanel },
        ]}
      />
    </div>
  );
}
