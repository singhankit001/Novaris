import type { Metadata } from "next";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, Page, PageHeader } from "@/components/seo/blocks";
import { buildOgImageUrl, createSeoMetadata, truncateMetaText } from "@/lib/seo";

function formatFeatureLabel(raw?: string): string {
  if (!raw) return "This feature";
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; slug?: string }>;
}): Promise<Metadata> {
  const { feature, slug } = await searchParams;
  const label = formatFeatureLabel(feature ?? slug);
  const title = label === "This feature" ? "Coming Soon" : `${label} Coming Soon`;
  const description = truncateMetaText(
    label === "This feature"
      ? "This Novaris page is under active development and will be available soon."
      : `${label} is on the roadmap. Novaris is actively building this experience.`,
    180,
  );

  return createSeoMetadata({
    title,
    description,
    canonical: feature
      ? `/coming-soon?feature=${encodeURIComponent(feature)}`
      : slug
        ? `/coming-soon?slug=${encodeURIComponent(slug)}`
        : "/coming-soon",
    ogImage: buildOgImageUrl("marketing", {
      variant: "coming-soon",
      title,
      description,
      footer: "Roadmap",
    }),
    ogTitle: title,
    ogDescription: description,
    noIndex: true,
  });
}

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; slug?: string }>;
}) {
  const { feature, slug } = await searchParams;
  const label = formatFeatureLabel(feature ?? slug);

  return (
    <SiteChrome>
      <Page>
        <PageHeader
          eyebrow="Roadmap"
          title={`${label} is not available yet`}
          lead="This page is not built yet. The pages that exist today are under Solutions and Insights."
        />
        <div className="flex flex-wrap gap-3">
          <ActionLink href="/solutions" variant="primary">Explore solutions</ActionLink>
          <ActionLink href="/blog">Read insights</ActionLink>
        </div>
      </Page>
    </SiteChrome>
  );
}
