import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getCuratedRepos, getIndexableTopics, getCatalogStats } from "@/lib/repo-catalog";
import IndexManagementClient from "./IndexManagementClient";
import PageHeader from "@/components/Dashboard/PageHeader";

export const revalidate = 0;

export default async function AdminIndexManagementPage() {
  const session = await auth();

  if (!isAdminUser(session)) {
    redirect("/");
  }

  const [repos, topics, stats] = await Promise.all([getCuratedRepos(), getIndexableTopics(), getCatalogStats()]);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader eyebrow="Admin" title="Index management" description="Audit the curated repository catalog and indexable topics." />
      <IndexManagementClient repos={repos} topics={topics} stats={stats} />
    </div>
  );
}
