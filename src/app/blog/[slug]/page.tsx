import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/services/blog-service";
import { notFound } from "next/navigation";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, H2, LinkRow, Page } from "@/components/seo/blocks";
import { Breadcrumbs } from "@/components/nv/nav";
import { cn } from "@/components/nv/cn";
import s from "@/components/seo/seo.module.css";
import { EnhancedMarkdown } from "@/components/EnhancedMarkdown";
import JsonLdScript from "@/components/JsonLdScript";
import { BlogPost } from "@prisma/client";
import { Metadata } from "next";
import { buildOgImageUrl, createSeoMetadata, truncateMetaText } from "@/lib/seo";
import { buildBlogPostingStructuredData, buildBreadcrumbStructuredData } from "@/lib/structured-data";

// Generates static params for all blog posts
export async function generateStaticParams() {
  try {
    const posts: BlogPost[] = await getPublishedPosts();
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.warn("Skipping static blog generation: Database connection failed (likely missing DATABASE_URL during build).");
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return createSeoMetadata({
      title: "Post Not Found",
      description: "This blog post could not be found.",
      canonical: "/blog",
      ogImage: buildOgImageUrl("marketing", { variant: "home" }),
      ogTitle: "Post Not Found",
      ogDescription: "This blog post could not be found.",
      noIndex: true,
    });
  }

  const canonicalPath = `/blog/${post.slug}`;
  const publishedTime = (post.publishedAt ?? post.createdAt).toISOString();

  const description = truncateMetaText(post.excerpt, 180);
  const keywords = typeof post.keywords === "string"
    ? post.keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : undefined;

  const metadata = createSeoMetadata({
    title: post.title,
    description,
    keywords,
    canonical: canonicalPath,
    ogImage: buildOgImageUrl("blog", {
      title: post.title,
      description,
      category: post.category,
      image: post.image,
      author: post.author,
    }),
    ogTitle: post.title,
    ogDescription: description,
    ogType: "article",
    twitterImage: post.image,
    twitterTitle: post.title,
    twitterDescription: description,
  });

  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    url: canonicalPath,
    publishedTime,
    modifiedTime: post.updatedAt.toISOString(),
    authors: [post.author],
  };

  return metadata;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const blogPostingSchema = buildBlogPostingStructuredData({
    title: post.title,
    excerpt: post.excerpt,
    image: post.image,
    author: post.author,
    slug: post.slug,
    publishedAtIso: (post.publishedAt || post.createdAt).toISOString(),
    updatedAtIso: post.updatedAt.toISOString(),
  });

  const readingMinutes = Math.max(1, Math.round(post.content.trim().split(/\s+/).length / 200));

  const breadcrumbSchema = buildBreadcrumbStructuredData([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <SiteChrome current="/blog">
      <JsonLdScript data={blogPostingSchema} />
      <JsonLdScript data={breadcrumbSchema} />

      <Page wide>
        <article>
          <header className={s.hero}>
            <div aria-hidden className={cn(s.heroGlow, "nv-aurora")}>
              <div className={cn(s.heroGrid, "nv-grid-paper")} />
            </div>
            <div className={s.crumbs}>
              <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Insights", href: "/blog" }, { label: post.title }]} />
            </div>
            <p className={s.articleMeta}>
              <span className={s.chip}>{post.category}</span>
              <span className="nv-num">{post.date}</span>
              <span className="nv-num">{readingMinutes} min read</span>
            </p>
            <h1 className={cn(s.articleTitle, "nv-display")}>{post.title}</h1>
            <p className={s.lead}>{post.excerpt}</p>
            <p className={s.byline}>By {post.author}</p>
          </header>

          <div className={s.cover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt="" width={1600} height={800} />
          </div>

          <div className={cn(s.article, "prose [--tw-prose-body:var(--nv-ivory-200)] [--tw-prose-headings:var(--nv-ivory-50)] [--tw-prose-lead:var(--nv-ivory-200)] [--tw-prose-links:var(--nv-copper-400)] [--tw-prose-bold:var(--nv-ivory-50)] [--tw-prose-counters:var(--nv-ivory-300)] [--tw-prose-bullets:var(--nv-copper-600)] [--tw-prose-hr:var(--nv-graphite-700)] [--tw-prose-quotes:var(--nv-ivory-100)] [--tw-prose-quote-borders:var(--nv-violet-400)] [--tw-prose-captions:var(--nv-ivory-300)] [--tw-prose-code:var(--nv-ivory-100)] [--tw-prose-th-borders:var(--nv-graphite-600)] [--tw-prose-td-borders:var(--nv-graphite-700)] prose-headings:font-nv-display prose-headings:font-semibold prose-headings:tracking-tight")}>
            <EnhancedMarkdown content={post.content} />
          </div>
        </article>

        <section aria-labelledby="post-related-h" className={cn(s.grid12, "mt-24")}>
          <div className={cn(s.left, s.stickyLeft)}>
            <H2 id="post-related-h">Related workflows</H2>
          </div>
          <div className={s.right}>
            <div className={s.rows}>
              <LinkRow href="/github-repository-analysis" title="GitHub Repository Analysis" />
              <LinkRow href="/ai-code-review-tool" title="AI Code Review Tool" />
              <LinkRow href="/security-scanner" title="Security Scanner" />
            </div>
            <div className="mt-8">
              <ActionLink href="/" variant="primary" large>Analyze a repository</ActionLink>
            </div>
          </div>
        </section>
      </Page>
    </SiteChrome>
  );
}
