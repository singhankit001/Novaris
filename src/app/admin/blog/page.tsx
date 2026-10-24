import { getAllPosts } from "@/lib/services/blog-service";
import Link from "next/link";
import { Edit3, Eye, PlusCircle } from "lucide-react";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import PageHeader from "@/components/Dashboard/PageHeader";
import { StatusPill } from "@/components/nv/badge";
import { buttonClasses } from "@/components/nv/button-styles";
import { DataTable, type Column } from "@/components/nv/data";
import { EmptyState } from "@/components/nv/states";

type Post = Awaited<ReturnType<typeof getAllPosts>>[number];

const iconLink = "inline-flex size-11 items-center justify-center rounded-nv-sm text-nv-ivory-200 hover:bg-nv-graphite-800 hover:text-nv-ivory-50";

const columns: Column<Post>[] = [
  {
    key: "title",
    header: "Title",
    render: (p) => (
      <span className="flex flex-col">
        <span className="text-nv-ivory-50">{p.title}</span>
        <span className="font-mono text-nv-micro text-nv-ivory-300">/{p.slug}</span>
      </span>
    ),
  },
  { key: "status", header: "Status", render: (p) => <StatusPill status={p.published ? "success" : "warning"}>{p.published ? "Published" : "Draft"}</StatusPill> },
  { key: "category", header: "Category", render: (p) => p.category },
  { key: "date", header: "Date", render: (p) => p.date },
  {
    key: "actions",
    header: "Actions",
    render: (p) => (
      <span className="flex items-center gap-1">
        {p.published ? (
          <Link href={`/blog/${p.slug}`} target="_blank" aria-label={`View ${p.title} live`} className={iconLink}>
            <Eye aria-hidden className="size-4" />
          </Link>
        ) : (
          <span role="img" aria-label="Drafts are not publicly visible" title="Drafts are not publicly visible" className={`${iconLink} cursor-not-allowed opacity-45`}>
            <Eye aria-hidden className="size-4" />
          </span>
        )}
        <Link href={`/admin/blog/${p.id}`} aria-label={`Edit ${p.title}`} className={iconLink}>
          <Edit3 aria-hidden className="size-4" />
        </Link>
        <DeletePostButton id={p.id} title={p.title} />
      </span>
    ),
  },
];

export default async function BlogAdminPage() {
  const posts = await getAllPosts();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Blog posts"
        description="Articles, drafts and published content."
        actions={
          <Link href="/admin/blog/new" className={buttonClasses("primary")}>
            <PlusCircle aria-hidden className="size-4" />
            Create post
          </Link>
        }
      />
      {posts.length === 0 ? (
        <EmptyState title="No posts yet" action={<Link href="/admin/blog/new" className={buttonClasses("primary")}>Create the first post</Link>}>
          <p>Drafts and published posts will be listed here.</p>
        </EmptyState>
      ) : (
        <DataTable caption="Blog posts" columns={columns} rows={posts} rowKey={(p) => p.id} />
      )}
    </div>
  );
}
