import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import SeoVisual from "@/components/seo/SeoVisual";
import SiteChrome from "@/components/seo/SiteChrome";
import { ActionLink, FaqList, H2, LinkRow, Page, PageHeader, Prose } from "@/components/seo/blocks";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildItemListStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Repository Analysis, AI Code Review, and Security Scanning Solutions",
  description:
    "Explore Novaris solutions for GitHub repository analysis, AI code review, and security scanning with context-aware workflows and action-ready outputs.",
  canonical: "/solutions",
  keywords: [
    "repository analysis solutions",
    "ai code review solution",
    "repository security scanner",
    "github code analyzer tools",
    "developer security workflow",
    "novaris solutions",
  ],
  ogImage: buildOgImageUrl("marketing", { variant: "solutions" }),
  ogTitle: "Novaris Solutions for Repository Analysis and Security",
  ogDescription:
    "Choose the right workflow for architecture understanding, review quality, and context-aware security prioritization.",
});

const solutionCards = [
  {
    title: "GitHub Repository Analysis",
    description:
      "Understand architecture, module boundaries, and operational risk before adoption or migration.",
    href: "/github-repository-analysis",
  },
  {
    title: "AI Code Review Tool",
    description:
      "Improve review quality with repository-level context and practical follow-up recommendations.",
    href: "/ai-code-review-tool",
  },
  {
    title: "Security Scanner",
    description:
      "Prioritize high-impact findings with architecture-aware triage and remediation guidance.",
    href: "/security-scanner",
  },
];

const compareLinks = [
  { name: "Static Analysis vs Novaris", href: "/static-analysis-vs-novaris" },
  { name: "Novaris vs SonarQube", href: "/novaris-vs-sonarqube" },
  { name: "Novaris vs Snyk", href: "/novaris-vs-snyk" },
];

const faqItems = [
  {
    question: "What is the best Novaris solution to start with?",
    answer:
      "Most teams start with GitHub Repository Analysis to build architectural context, then branch into AI Code Review or Security Scanner depending on immediate priorities.",
  },
  {
    question: "Can these workflows be used together in one process?",
    answer:
      "Yes. Teams often analyze architecture first, review implementation quality second, and finish with security triage for release readiness.",
  },
  {
    question: "Which solution is best for onboarding new engineers?",
    answer:
      "GitHub Repository Analysis is usually the fastest path for onboarding because it shortens time-to-understanding on unfamiliar codebases.",
  },
  {
    question: "Does the Security Scanner replace existing AppSec tools?",
    answer:
      "No. It complements existing AppSec tooling by improving prioritization and remediation planning with repository context.",
  },
  {
    question: "How does AI Code Review improve pull request outcomes?",
    answer:
      "It provides context-aware review signals that help teams focus on high-impact logic and dependency risks beyond the diff itself.",
  },
  {
    question: "How should teams measure success after adoption?",
    answer:
      "Common metrics include reduced onboarding time, faster review cycles, and shorter time-to-remediation for high-priority findings.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Solutions", path: "/solutions" },
]);

const itemListSchema = buildItemListStructuredData({
  name: "Novaris Solution Workflows",
  items: solutionCards.map((card) => ({ name: card.title, path: card.href })),
});

const faqSchema = buildFaqStructuredData(faqItems);
const softwareSchema = buildSoftwareApplicationStructuredData({
  name: "Novaris Solutions",
  description:
    "Integrated workflows for repository analysis, AI code review, and security scanning with context-aware prioritization.",
  path: "/solutions",
  featureList: [
    "GitHub repository analysis",
    "AI code review with repository context",
    "Security triage and remediation prioritization",
    "Workflow-specific comparison guides",
  ],
});

export default function SolutionsPage() {
  return (
    <SiteChrome current="/solutions">
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />
      <JsonLdScript data={faqSchema} />
      <JsonLdScript data={softwareSchema} />

      <Page wide>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Solutions" }]}
          eyebrow="Solutions"
          title="Repository analysis, AI code review, and security scanning"
          lead="Novaris gives engineering teams one place to understand architecture, review implementation, and triage security findings, starting from a GitHub URL."
        >
          <Prose className="mt-4">
            <p>
              Choose a starting point based on your immediate goal, then connect workflows for onboarding, release
              readiness, and technical risk review.
            </p>
          </Prose>
        </PageHeader>

        <section aria-label="Workflow illustration" className="mb-16 max-w-4xl">
          <SeoVisual variant="hero-flow" ariaLabel="Novaris solutions workflow from repository input to analysis and action, illustrative" />
        </section>

        <section aria-labelledby="sol-start-h" className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <H2 id="sol-start-h">Pick a starting point</H2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <div className="border-t border-nv-graphite-700">
              {solutionCards.map((card) => (
                <LinkRow key={card.href} href={card.href} title={card.title} summary={card.description} meta="Open" />
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="sol-choose-h" className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <H2 id="sol-choose-h">How to choose the right workflow</H2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Prose>
              <p>
                Start with <strong>GitHub Repository Analysis</strong> when the primary challenge is understanding
                architecture and module relationships. This is the best first move for onboarding, due diligence, or
                migration planning.
              </p>
            </Prose>
            <div className="mt-6 space-y-6">
              <div className="border-t border-nv-graphite-700 pt-4">
                <h3 className="mb-2 text-nv-title font-medium text-nv-ivory-50">Use AI Code Review Tool when review quality is the bottleneck</h3>
                <Prose>
                  <p>
                    If pull requests are slow or recurring issues slip through, move into the AI Code Review workflow to
                    prioritize high-impact review topics with richer repository context.
                  </p>
                </Prose>
              </div>
              <div className="border-t border-nv-graphite-700 pt-4">
                <h3 className="mb-2 text-nv-title font-medium text-nv-ivory-50">Use Security Scanner when triage speed matters most</h3>
                <Prose>
                  <p>
                    When security findings outpace remediation capacity, Security Scanner helps teams focus on likely
                    high-impact risks and convert findings into sprint-ready engineering actions.
                  </p>
                </Prose>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="sol-compare-h" className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <H2 id="sol-compare-h">Comparison guides for tool selection</H2>
            <p className="mt-3 text-nv-body text-nv-ivory-200">
              Written guides that compare approaches by context depth, triage quality, and remediation clarity.
            </p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <div className="border-t border-nv-graphite-700">
              {compareLinks.map((item) => (
                <LinkRow key={item.href} href={item.href} title={item.name} />
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="sol-faq-h" className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <H2 id="sol-faq-h">Frequently asked questions</H2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <FaqList items={faqItems} />
          </div>
        </section>

        <section aria-labelledby="sol-next-h" className="border-t border-nv-copper-600 pt-8">
          <H2 id="sol-next-h">Next step</H2>
          <p className="mt-3 max-w-[var(--nv-measure)] text-nv-body text-nv-ivory-200">
            Start with one repository, then keep the workflow that answers your questions best.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionLink href="/chat" variant="primary">Start analysis</ActionLink>
            <ActionLink href="/explore">Explore guides</ActionLink>
            <ActionLink href="/compare">Compare workflows</ActionLink>
          </div>
        </section>
      </Page>
    </SiteChrome>
  );
}
