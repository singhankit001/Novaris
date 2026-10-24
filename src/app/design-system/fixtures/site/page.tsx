import { Suspense } from "react";
import type { BlogPost } from "@prisma/client";
import HomeClient from "@/app/HomeClient";
import type { CatalogRepoEntry } from "@/lib/repo-catalog";

// FIXTURE: every value below is fake and exists only to exercise the landing page layout in development.
const repo = (owner: string, name: string, stars: number): CatalogRepoEntry => ({
  owner,
  repo: name,
  stars,
  description: `Fixture description for ${owner}/${name}`,
  topics: [],
  language: "TypeScript",
});
const weekly = [repo("fixture-org", "alpha", 1200), repo("fixture-org", "beta", 980), repo("fixture-org", "gamma", 640)];
const posts = [
  { slug: "fixture-post", title: "Fixture post title for layout checks", category: "Fixture", date: "1 Jan 2026" },
] as unknown as BlogPost[];

export default function SiteFixture() {
  return (
    <Suspense fallback={null}>
      <HomeClient initialPosts={posts} weeklyTrending={weekly} monthlyTrending={weekly} publicStats={{ totalVisitors: 120, totalQueries: 345, totalScans: 67 }} />
    </Suspense>
  );
}
