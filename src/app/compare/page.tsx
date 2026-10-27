import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import s from "@/components/seo/seo.module.css";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, H2, Page, PageHeader } from "@/components/seo/blocks";
import { GuideFinder } from "@/components/experiences/compare/guide-finder";
import { cn } from "@/components/nv/cn";
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
    question: "How do rule-based checks differ from reading a whole repository?",
  },
  {
    title: "Novaris vs SonarQube",
    href: "/novaris-vs-sonarqube",
    summary: "Understand where SonarQube and Novaris can complement each other.",
    question: "Where do code-quality gates and repository analysis fit together?",
  },
  {
    title: "Novaris vs Snyk",
    href: "/novaris-vs-snyk",
    summary: "Compare security context, triage quality, and actionability.",
    question: "How does broad security coverage compare with repository-level triage?",
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

        <GuideFinder guides={comparisonPages} />

        <div className={cn(s.grid12, "mt-20")}>
          <div className="min-w-0 lg:col-span-7">
            <H2>How each guide compares</H2>
            <ul className="mt-8 flex list-none flex-wrap gap-2 p-0">
              {["Context depth", "Triage quality", "Remediation clarity", "Onboarding speed", "Workflow fit"].map((c) => (
                <li key={c} className="rounded-full border border-nv-graphite-700 bg-white px-4 py-2 text-nv-small text-nv-ivory-200">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[var(--nv-measure)] text-nv-small text-nv-ivory-300">
              Every guide uses the same five criteria, so the tables read the same way.
            </p>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <Notice tone="info" title="These are articles, not a comparison tool">
              There is no interactive matrix or benchmark here. Each guide is editorial writing based on public
              documentation. Check each vendor&apos;s current docs before you decide.
            </Notice>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink href="/solutions">Explore solutions</ActionLink>
              <ActionLink href="/blog" variant="primary">Read insights</ActionLink>
            </div>
          </aside>
        </div>
      </Page>
    </SiteChrome>
  );
}
