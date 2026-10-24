import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/services/blog-service";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, Page, PageHeader } from "@/components/seo/blocks";
import { Badge } from "@/components/nv/badge";
import { EmptyState } from "@/components/nv/states";
import { BlogPost } from "@prisma/client";
import JsonLdScript from "@/components/JsonLdScript";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbStructuredData, buildItemListStructuredData } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export const metadata = createSeoMetadata({
  title: "Engineering Insights for Repository Analysis and Security",
  description: "Read practical guides on GitHub repository analysis, AI code review, and repository security scanning workflows.",
  canonical: "/blog",
  ogImage: buildOgImageUrl("marketing", { variant: "blog" }),
  ogTitle: "Ankit's Engineering Insights",
  ogDescription: "Practical guides for repository analysis, context-aware review, and security-first engineering.",
});

export default async function BlogIndex() {
  const posts: BlogPost[] = await getPublishedPosts();
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);
  const breadcrumbSchema = buildBreadcrumbStructuredData([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/blog" },
  ]);
  const itemListSchema = buildItemListStructuredData({
    name: "Novaris Insights",
    items: posts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })),
  });

  return (
    <SiteChrome current="/blog">
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />

      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Insights" }]}
          eyebrow="Insights"
          title="Engineering insights"
          lead="Notes on GitHub repository analysis, code review with repository context, and security-first engineering."
        >
          <nav aria-label="Related pages" className="mt-6 flex flex-wrap gap-3">
            <ActionLink href="/github-repository-analysis">Repository analysis</ActionLink>
            <ActionLink href="/ai-code-review-tool">AI code review</ActionLink>
            <ActionLink href="/security-scanner">Security scanner</ActionLink>
            <ActionLink href="/explore">Explore pages</ActionLink>
          </nav>
        </PageHeader>

        {posts.length === 0 ? (
          <EmptyState
            title="No posts published yet"
            action={<ActionLink href="/solutions" variant="primary">Read the solution guides</ActionLink>}
          >
            <p>Articles will appear here when they are published. The solution guides cover the same topics in the meantime.</p>
          </EmptyState>
        ) : (
          <>
            {featuredPost && (
              <article className="group mb-14 grid grid-cols-1 gap-6 overflow-hidden rounded-nv-lg border border-nv-graphite-700 bg-nv-graphite-900 p-5 md:p-8 lg:grid-cols-12 lg:items-center lg:gap-10">
                <Link href={`/blog/${featuredPost.slug}`} tabIndex={-1} aria-hidden className="relative aspect-video overflow-hidden rounded-nv-md border border-nv-graphite-700 lg:col-span-5">
                  <Image src={featuredPost.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover transition-transform duration-700 ease-nv-out group-hover:scale-[1.035]" />
                </Link>
                <div className="lg:col-span-6 lg:col-start-7">
                  <p className="nv-eyebrow nv-num mb-3 flex flex-wrap items-center gap-3">
                    <Badge>{featuredPost.category}</Badge>
                    <span>{featuredPost.date}</span>
                  </p>
                  <h2 className="nv-display text-nv-display-md text-balance text-nv-ivory-50">
                    <Link href={`/blog/${featuredPost.slug}`} className="hover:text-nv-copper-300">
                      {featuredPost.title}
                    </Link>
                  </h2>
                  <p className="mt-4 max-w-[var(--nv-measure)] text-pretty text-nv-body text-nv-ivory-200">{featuredPost.excerpt}</p>
                  <p className="mt-4 text-nv-small text-nv-ivory-300">By {featuredPost.author}</p>
                </div>
              </article>
            )}

            {regularPosts.length > 0 && (
              <section aria-labelledby="blog-all-h">
                <h2 id="blog-all-h" className="mb-5 text-nv-title font-semibold text-nv-ivory-100">
                  All posts
                </h2>
                <ul className="m-0 list-none border-t border-nv-graphite-700 p-0">
                  {regularPosts.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group grid gap-1 border-b border-nv-graphite-700 rounded-nv-sm px-4 py-6 transition-colors hover:bg-nv-graphite-900 md:grid-cols-12 md:gap-10"
                      >
                        <span className="nv-eyebrow nv-num md:col-span-3">
                          {post.date} · {post.category}
                        </span>
                        <span className="md:col-span-9">
                          <span className="block text-nv-title font-medium text-nv-ivory-50 group-hover:text-nv-copper-300">{post.title}</span>
                          <span className="mt-1 block max-w-[var(--nv-measure)] text-pretty text-nv-small text-nv-ivory-300">{post.excerpt}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </Page>
    </SiteChrome>
  );
}
