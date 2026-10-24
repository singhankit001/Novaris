import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, FaqList, H2, LinkRow, Page, PageHeader, Prose } from "@/components/seo/blocks";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildItemListStructuredData,
} from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Explore GitHub Analysis and Security Workflows",
  description:
    "Explore live Novaris pages for GitHub code analysis, AI code review, repository risk analysis, and security workflow comparisons.",
  canonical: "/explore",
  keywords: [
    "explore repository analysis workflows",
    "github analysis pages",
    "security scanner guides",
    "code review workflow hub",
    "novaris comparison pages",
    "software architecture analysis guides",
  ],
  ogImage: buildOgImageUrl("marketing", { variant: "explore" }),
  ogTitle: "Explore Novaris Workflow Pages",
  ogDescription:
    "Browse live, indexable pages for repository analysis, code review, and security-first engineering decisions.",
});

type TopicEntry = {
  title: string;
  slug: string;
  summary: string;
  category: "Analysis" | "Security" | "Comparison";
};

export const livePages: TopicEntry[] = [
  {
    title: "GitHub Repository Analysis",
    slug: "/github-repository-analysis",
    summary: "Understand architecture, implementation boundaries, and risk hotspots in unfamiliar repositories.",
    category: "Analysis",
  },
  {
    title: "GitHub Code Analyzer",
    slug: "/github-code-analyzer",
    summary: "Analyze repository structure and code behavior with full-file context.",
    category: "Analysis",
  },
  {
    title: "TypeScript Code Analyzer",
    slug: "/typescript-code-analyzer",
    summary: "Navigate large TypeScript repositories with context-aware architecture understanding.",
    category: "Analysis",
  },
  {
    title: "AI Code Review Tool",
    slug: "/ai-code-review-tool",
    summary: "Improve review quality and speed with repository-level context.",
    category: "Analysis",
  },
  {
    title: "Security Scanner",
    slug: "/security-scanner",
    summary: "Prioritize security findings with implementation and architecture context.",
    category: "Security",
  },
  {
    title: "Node.js Security Scanner",
    slug: "/nodejs-security-scanner",
    summary: "Evaluate Node.js repository risk with actionable triage paths.",
    category: "Security",
  },
  {
    title: "Open Source Security Scanner",
    slug: "/open-source-security-scanner",
    summary: "Assess open-source repository security posture before adoption.",
    category: "Security",
  },
  {
    title: "Repository Risk Analysis",
    slug: "/repository-risk-analysis",
    summary: "Evaluate complexity and security exposure for faster engineering decisions.",
    category: "Security",
  },
  {
    title: "Static Analysis vs Novaris",
    slug: "/static-analysis-vs-novaris",
    summary: "Compare rule-based static analysis and context-aware repository workflows.",
    category: "Comparison",
  },
  {
    title: "Novaris vs SonarQube",
    slug: "/novaris-vs-sonarqube",
    summary: "Understand where SonarQube and Novaris are complementary.",
    category: "Comparison",
  },
  {
    title: "Novaris vs Snyk",
    slug: "/novaris-vs-snyk",
    summary: "Compare security context, triage speed, and workflow fit.",
    category: "Comparison",
  },
];

const grouped = {
  Analysis: livePages.filter((page) => page.category === "Analysis"),
  Security: livePages.filter((page) => page.category === "Security"),
  Comparison: livePages.filter((page) => page.category === "Comparison"),
};

const faqItems = [
  {
    question: "What is the purpose of the Explore page?",
    answer:
      "Explore is the navigation hub for Novaris analysis, security, and comparison guides so teams can find the right workflow quickly.",
  },
  {
    question: "Are all listed pages indexable and live?",
    answer:
      "Yes. The pages listed in this hub are designed as live, indexable resources for repository analysis and security decision support.",
  },
  {
    question: "Where should I start if I am new to Novaris?",
    answer:
      "Start with GitHub Repository Analysis for architecture understanding, then move to AI Code Review or Security Scanner based on your immediate goal.",
  },
  {
    question: "How should I use comparison pages?",
    answer:
      "Use comparison pages when selecting tooling strategy, especially when balancing baseline coverage with context-aware triage and remediation planning.",
  },
  {
    question: "Can this help with open-source due diligence?",
    answer:
      "Yes. Use Open Source Security Scanner and Repository Risk Analysis pages to evaluate adoption risk more systematically.",
  },
  {
    question: "Does this page include direct paths to execution?",
    answer:
      "Yes. Each section includes direct links to workflows and the main analysis entry point at /chat.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Explore", path: "/explore" },
]);

const itemListSchema = buildItemListStructuredData({
  name: "Novaris Live Workflow Pages",
  items: livePages.map((entry) => ({ name: entry.title, path: entry.slug })),
});

const faqSchema = buildFaqStructuredData(faqItems);

function TopicSection({ title, items }: { title: string; items: TopicEntry[] }) {
  return (
    <section aria-label={title} className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-10">
      <h2 className="nv-display text-nv-display-md text-balance text-nv-ivory-50 lg:col-span-4">{title}</h2>
      <div className="border-t border-nv-graphite-700 lg:col-span-7 lg:col-start-6">
        {items.map((item) => (
          <LinkRow key={item.slug} href={item.slug} title={item.title} summary={item.summary} />
        ))}
      </div>
    </section>
  );
}

export default function ExplorePage() {
  return (
    <SiteChrome>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />
      <JsonLdScript data={faqSchema} />

      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Explore" }]}
          eyebrow="Explore"
          title="Analysis, security and comparison pages"
          lead="An index of every Novaris guide, grouped by what you are trying to decide."
        >
          <Prose className="mt-4">
            <p>Choose Analysis when you need to understand a codebase, Security when you are triaging risk, and Comparison when you are choosing tools.</p>
          </Prose>
        </PageHeader>

        <div className="space-y-14">
          <TopicSection title="Code analysis" items={grouped.Analysis} />
          <TopicSection title="Security" items={grouped.Security} />
          <TopicSection title="Comparison guides" items={grouped.Comparison} />

          <section aria-labelledby="ex-faq-h" className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <H2 id="ex-faq-h">Frequently asked questions</H2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <FaqList items={faqItems} />
            </div>
          </section>

          <section aria-label="Related" className="flex flex-wrap gap-3 border-t border-nv-copper-600 pt-8">
            <ActionLink href="/chat" variant="primary">Start analysis</ActionLink>
            <ActionLink href="/solutions">Solutions</ActionLink>
            <ActionLink href="/compare">Compare workflows</ActionLink>
          </section>
        </div>
      </Page>
    </SiteChrome>
  );
}
