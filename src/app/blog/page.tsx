import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/services/blog-service";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, Page, PageHeader } from "@/components/seo/blocks";
import { cn } from "@/components/nv/cn";
import s from "@/components/seo/seo.module.css";
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
          <nav aria-label="Related pages" className={s.pillRow}>
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
              <article className={s.feature}>
                <div className={s.featureImg}>
                  <Image src={featuredPost.image} alt="" fill sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover" priority />
                </div>
                <div>
                  <p className={s.articleMeta}>
                    <span className={s.chip}>{featuredPost.category}</span>
                    <span className="nv-num">{featuredPost.date}</span>
                  </p>
                  <h2 className={cn(s.featureTitle, "nv-display")}>
                    <Link href={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                  </h2>
                  <p className={cn(s.postExcerpt, "!max-w-[48ch] !text-base")}>{featuredPost.excerpt}</p>
                  <p className="mt-6 text-sm text-nv-ivory-300">By {featuredPost.author}</p>
                </div>
              </article>
            )}

            {regularPosts.length > 0 && (
              <section aria-labelledby="blog-all-h" className="mt-20">
                <h2 id="blog-all-h" className="nv-eyebrow mb-6">
                  All posts
                </h2>
                <ul className={s.postGrid}>
                  {regularPosts.map((post, i) => (
                    <li key={post.slug} className={s.post}>
                      <span aria-hidden className={cn(s.postNum, "nv-num")}>{String(i + 2).padStart(2, "0")}</span>
                      <p className={cn(s.articleMeta, "!mb-0 mt-4")}>
                        <span className="nv-num">{post.date}</span>
                        <span>{post.category}</span>
                      </p>
                      <h3 className={cn(s.postTitle, "nv-display")}>
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className={s.postExcerpt}>{post.excerpt}</p>
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
