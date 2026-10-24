import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllPosts } from "@/lib/services/blog-service";
import { getAnalyticsSummary } from "@/lib/analytics";
import { getCatalogStats } from "@/lib/repo-catalog";
import PageHeader from "@/components/Dashboard/PageHeader";
import { Metric, MetricGroup } from "@/components/nv/data";

const areas = [
  { href: "/admin/blog", title: "Blog", body: "Write, publish and delete posts." },
  { href: "/admin/index", title: "Index", body: "Audit the curated repository catalog and topics." },
  { href: "/admin/stats", title: "Analytics", body: "Visitors, queries, funnel and false-positive review." },
];

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!isAdminUser(session)) {
    redirect("/");
  }

  const [posts, analytics, catalogStats] = await Promise.all([getAllPosts(), getAnalyticsSummary(), getCatalogStats()]);
  const published = posts.filter((post) => post.published).length;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Admin" title="Overview" description="Totals as stored in the database, analytics store and repository catalog." />
      <MetricGroup className="md:grid-cols-5">
        <Metric label="Posts" value={posts.length} source={`${published} published`} />
        <Metric label="Curated repos" value={catalogStats.totalRepos.toLocaleString()} source="repository catalog" />
        <Metric label="Topics" value={catalogStats.totalTopics.toLocaleString()} source="repository catalog" />
        <Metric label="Visitors" value={analytics.totalVisitors} source="analytics store" />
        <Metric label="Queries" value={analytics.totalQueries} source="analytics store" />
      </MetricGroup>
      <nav aria-label="Admin areas">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {areas.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="group block min-h-32 rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-6 transition-colors hover:border-nv-copper-400/40 hover:bg-nv-copper-wash">
                <span className="nv-display block text-nv-title text-nv-ivory-50">{a.title}</span>
                <span className="mt-1 block text-nv-small text-nv-ivory-300">{a.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
