import { getPublishedPosts } from "@/lib/services/blog-service";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, Page, PageHeader } from "@/components/seo/blocks";
import { EmptyShelf, FeaturedPost, PostGrid } from "@/components/experiences/blog/post-cards";
import s from "@/components/seo/seo.module.css";
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
          <div>
            <EmptyShelf />
            <div className="mt-6">
              <ActionLink href="/solutions" variant="primary">Read the solution guides</ActionLink>
            </div>
          </div>
        ) : (
          <>
            {featuredPost && <FeaturedPost post={featuredPost} />}

            {regularPosts.length > 0 && (
              <section aria-labelledby="blog-all-h" className="mt-20">
                <h2 id="blog-all-h" className="nv-eyebrow mb-6">
                  All posts
                </h2>
                <PostGrid posts={regularPosts} />
              </section>
            )}
          </>
        )}
      </Page>
    </SiteChrome>
  );
}
