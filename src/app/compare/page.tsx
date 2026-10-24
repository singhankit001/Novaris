import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, H2, LinkRow, Page, PageHeader } from "@/components/seo/blocks";
import { Notice } from "@/components/nv/notice";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbStructuredData, buildItemListStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Compare Repository Analysis and Security Workflows",
  description:
    "Compare Novaris workflows for repository analysis, AI code review, and security scanning across context depth and actionability.",
  canonical: "/compare",
  ogImage: buildOgImageUrl("marketing", { variant: "compare" }),
  ogTitle: "Compare Novaris Workflows and Alternatives",
  ogDescription: "See how context-aware analysis differs from snippet-first and rule-only workflows.",
});

const comparisonPages = [
  {
    title: "Static Analysis vs Novaris",
    href: "/static-analysis-vs-novaris",
    summary: "Compare rule-based static analysis and context-aware repository workflows.",
  },
  {
    title: "Novaris vs SonarQube",
    href: "/novaris-vs-sonarqube",
    summary: "Understand where SonarQube and Novaris can complement each other.",
  },
  {
    title: "Novaris vs Snyk",
    href: "/novaris-vs-snyk",
    summary: "Compare security context, triage quality, and actionability.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Compare", path: "/compare" },
]);

const itemListSchema = buildItemListStructuredData({
  name: "Novaris Comparison Guides",
  items: comparisonPages.map((item) => ({ name: item.title, path: item.href })),
});

export default function ComparePage() {
  return (
    <SiteChrome current="/compare">
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />

      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]}
          eyebrow="Guides"
          title="Compare context-aware workflows"
          lead="Three written guides that compare repository analysis approaches by context depth, signal quality, and what you can do with the output."
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <h2 className="sr-only">Comparison guides</h2>
            <div className="border-t border-nv-graphite-700">
              {comparisonPages.map((track) => (
                <LinkRow key={track.title} href={track.href} title={track.title} summary={track.summary} meta="Guide" />
              ))}
            </div>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <Notice tone="info" title="These are articles, not a comparison tool">
              There is no interactive matrix or benchmark here. Each guide is editorial writing based on public
              documentation. Check each vendor&apos;s current docs before you decide.
            </Notice>
            <div className="mt-10">
              <H2>Keep reading</H2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionLink href="/solutions">Explore solutions</ActionLink>
              <ActionLink href="/blog" variant="primary">Read insights</ActionLink>
            </div>
          </aside>
        </div>
      </Page>
    </SiteChrome>
  );
}
