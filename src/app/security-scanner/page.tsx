import type { Metadata } from "next";
import SolutionPage from "@/components/seo/SolutionPage";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Repository Security Scanner",
  description:
    "Scan GitHub repositories for actionable security risks with Novaris and prioritize remediation using architecture-aware context.",
  canonical: "/security-scanner",
  keywords: [
    "repository security scanner",
    "github security scanner",
    "ai vulnerability triage",
    "security remediation prioritization",
    "code security analysis tool",
    "developer security workflow",
  ],
  ogImage: buildOgImageUrl("marketing", { variant: "security-scanner" }),
  ogTitle: "Repository Security Scanner with Context-Aware Triage",
  ogDescription:
    "Prioritize findings faster with architecture and implementation context.",
});

const faqItems = [
  {
    question: "What does Novaris security scanning focus on?",
    answer:
      "Novaris focuses on practical risk prioritization by pairing findings with architecture and implementation context.",
  },
  {
    question: "Can this support open-source due diligence?",
    answer:
      "Yes. Teams use it during open-source evaluation to understand likely risk impact before adoption.",
  },
  {
    question: "Does this replace all AppSec tooling?",
    answer:
      "No. It complements existing AppSec tools by improving triage quality and remediation clarity inside repositories.",
  },
  {
    question: "Who should use this workflow first?",
    answer:
      "Product security, platform teams, and engineering leads who need faster prioritization in high-change repositories.",
  },
  {
    question: "Can it improve remediation velocity?",
    answer:
      "Yes. Context-aware findings help teams convert alerts into clearer, owner-ready engineering tasks.",
  },
  {
    question: "How should success be measured?",
    answer:
      "Track time-to-triage, time-to-fix for high-severity findings, and recurrence rates in critical services.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Solutions", path: "/solutions" },
  { name: "Security Scanner", path: "/security-scanner" },
]);

const faqSchema = buildFaqStructuredData(faqItems);
const softwareSchema = buildSoftwareApplicationStructuredData({
  name: "Novaris Security Scanner",
  description:
    "Context-aware repository security scanner for actionable risk triage and remediation planning.",
  path: "/security-scanner",
  featureList: [
    "Repository security risk detection",
    "Architecture-aware triage",
    "Prioritized remediation guidance",
    "Cross-team security handoff support",
  ],
});

export default function SecurityScannerPage() {
  return (
    <SolutionPage
      crumbTitle="Security Scanner"
      h1="AI Security Scanner for Repositories"
      lead={["Novaris helps teams identify and prioritize repository security risks using architecture-aware analysis so remediation work starts with the issues most likely to impact real systems.", "Instead of handling alerts in isolation, teams get context-rich guidance that improves triage confidence, security-to-engineering handoff, and fix execution speed."]}
      visual={{ variant: "security-workflow", ariaLabel: "Repository security workflow from detection to prioritized remediation, illustrative" }}
      mainTitle="Why context-aware security scanning matters"
      mainIntro="Security backlogs often grow because findings are difficult to prioritize across busy engineering roadmaps. Novaris improves this by connecting findings to module criticality and implementation behavior."
      subsections={[{"title": "Prioritize what can hurt production first", "text": "Teams can focus effort on likely high-impact issues and avoid spending cycles on lower-value noise."}, {"title": "Improve fix quality and speed", "text": "Action-ready remediation guidance helps engineers implement and validate fixes faster with less ambiguity."}]}
      cards={[{"title": "Pre-release hardening", "text": "Run a focused scan before release milestones to catch and prioritize high-impact risks."}, {"title": "Open-source package evaluation", "text": "Assess dependency risk posture before introducing new repositories into your stack."}, {"title": "Backlog reduction", "text": "Use context-rich triage to reduce unresolved findings and improve remediation throughput."}, {"title": "Cross-team alignment", "text": "Build a shared understanding between AppSec and engineering with clearer prioritization rationale."}]}
      relatedTitle="Related security workflows"
      related={[{"href": "/open-source-security-scanner", "label": "Open Source Security Scanner"}, {"href": "/nodejs-security-scanner", "label": "Node.js Security Scanner"}, {"href": "/repository-risk-analysis", "label": "Repository Risk Analysis"}, {"href": "/novaris-vs-snyk", "label": "Novaris vs Snyk"}]}
      faqItems={faqItems}
      nextText="Run one high-priority security scan and convert findings into a ranked remediation plan this week."
      ctas={[{"href": "/chat", "label": "Start Security Scan", "primary": true}, {"href": "/ai-code-review-tool", "label": "Continue with AI Code Review"}, {"href": "/solutions", "label": "Back to Solutions"}]}
      schemas={[breadcrumbSchema, faqSchema, softwareSchema]}
    />
  );
}
