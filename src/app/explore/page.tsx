import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import s from "@/components/seo/seo.module.css";
import { cn } from "@/components/nv/cn";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, CtaBand, FaqList, H2, Page, PageHeader, Prose } from "@/components/seo/blocks";
import { AnalysisSection, CategoryBento, ComparisonSection, SecuritySection, type ExploreGroup } from "@/components/experiences/explore/ExploreHub";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import { livePages } from "./live-pages";
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

const groups: ExploreGroup[] = [
  { id: "analysis", title: "Code analysis", guidance: "Understand a codebase: architecture, boundaries and review quality.", entries: livePages.filter((page) => page.category === "Analysis") },
  { id: "security", title: "Security", guidance: "Triage risk with implementation and architecture context.", entries: livePages.filter((page) => page.category === "Security") },
  { id: "comparison", title: "Comparison guides", guidance: "Choose tools by comparing approaches.", entries: livePages.filter((page) => page.category === "Comparison") },
];
const [analysis, security, comparison] = groups as [ExploreGroup, ExploreGroup, ExploreGroup];

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

        <div className={s.stack}>
          <CategoryBento groups={groups} />
          <AnalysisSection group={analysis} />
          <SecuritySection group={security} />
          <ComparisonSection group={comparison} />

          <section aria-labelledby="ex-faq-h" className={s.grid12}>
            <div className={cn(s.left, s.stickyLeft)}>
              <H2 id="ex-faq-h">Frequently asked questions</H2>
            </div>
            <div className={s.right}>
              <FaqList items={faqItems} />
            </div>
          </section>

          <CtaBand id="ex-next-h" title={<>Start with <em>one repository</em></>} text="Open the analysis workspace, or keep reading the guides.">
            <ActionLink href="/chat" variant="primary" large>Start analysis</ActionLink>
            <ActionLink href="/solutions" large>Solutions</ActionLink>
            <ActionLink href="/compare" large>Compare workflows</ActionLink>
          </CtaBand>
        </div>
      </Page>
    </SiteChrome>
  );
}
