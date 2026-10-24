import type { Metadata } from "next";
import SolutionPage from "@/components/seo/SolutionPage";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "GitHub Repository Analysis",
  description:
    "Run full-context GitHub repository analysis with Novaris to map architecture, understand implementation behavior, and prioritize repository risk.",
  canonical: "/github-repository-analysis",
  keywords: [
    "github repository analysis",
    "analyze github repo architecture",
    "repository due diligence tool",
    "codebase architecture mapping",
    "repository risk assessment",
    "ai repository analyzer",
  ],
  ogImage: buildOgImageUrl("marketing", { variant: "github-repository-analysis" }),
  ogTitle: "GitHub Repository Analysis for Faster Engineering Decisions",
  ogDescription:
    "Understand unfamiliar repositories faster before integrating, reviewing, or contributing.",
});

const faqItems = [
  {
    question: "What is GitHub repository analysis in Novaris?",
    answer:
      "It is a workflow that maps architecture, behavior paths, and risk hotspots so teams can make faster technical decisions.",
  },
  {
    question: "When should teams run repository analysis?",
    answer:
      "Run it during onboarding, due diligence, migration planning, security triage preparation, and major release checkpoints.",
  },
  {
    question: "Can this be used for open-source adoption decisions?",
    answer:
      "Yes. Teams use it to evaluate maintainability, architecture complexity, and likely remediation effort before adoption.",
  },
  {
    question: "Who benefits the most from this workflow?",
    answer:
      "Platform teams, senior engineers, technical leads, and security reviewers who need fast context on unfamiliar codebases.",
  },
  {
    question: "Does it replace code review or security scanning?",
    answer:
      "No. It complements both by establishing a shared architecture context before deeper review and security workflows.",
  },
  {
    question: "What should happen after the first analysis run?",
    answer:
      "Use identified hotspots to prioritize review and security actions, then track improvements through recurring analysis checkpoints.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Solutions", path: "/solutions" },
  { name: "GitHub Repository Analysis", path: "/github-repository-analysis" },
]);

const faqSchema = buildFaqStructuredData(faqItems);
const softwareSchema = buildSoftwareApplicationStructuredData({
  name: "Novaris GitHub Repository Analysis",
  description:
    "Repository analysis workflow for architecture understanding, behavior interpretation, and risk prioritization.",
  path: "/github-repository-analysis",
  featureList: [
    "Architecture and dependency mapping",
    "Behavior path interpretation",
    "Risk hotspot identification",
    "Action-oriented analysis outputs",
  ],
});

export default function GitHubRepositoryAnalysisPage() {
  return (
    <SolutionPage
      crumbTitle="GitHub Repository Analysis"
      h1="GitHub Repository Analysis with Full-Context AI"
      lead={["Novaris helps teams evaluate unfamiliar repositories by mapping architecture, tracing implementation behavior, and surfacing risk hotspots that affect delivery confidence.", "The workflow is designed for practical decisions: whether to adopt a dependency, how to onboard quickly, and where to focus review effort when timelines are tight."]}
      visual={{ variant: "analysis-workflow", ariaLabel: "GitHub repository analysis workflow from ingest to insights, illustrative" }}
      mainTitle="What this workflow delivers"
      mainIntro="Novaris does more than summarize files. It highlights how modules connect, where critical logic resides, and which areas deserve deeper review before engineering investment increases."
      subsections={[{"title": "Architecture clarity for faster onboarding", "text": "Teams can understand major boundaries and dependencies early, reducing time spent in manual code discovery."}, {"title": "Risk visibility before expensive decisions", "text": "By revealing high-impact hotspots and fragile paths, teams can prioritize mitigation before they commit to integrations or rewrites."}]}
      cards={[{"title": "Due diligence", "text": "Evaluate open-source or third-party repositories for maintainability and risk before integration."}, {"title": "Onboarding", "text": "Help new engineers understand architecture faster and contribute with fewer review cycles."}, {"title": "Migration planning", "text": "Identify critical module dependencies and likely migration friction before planning execution."}, {"title": "Security preparation", "text": "Establish repository context first so security findings can be prioritized with better confidence."}]}
      relatedTitle="Related analysis paths"
      related={[{"href": "/github-code-analyzer", "label": "GitHub Code Analyzer"}, {"href": "/typescript-code-analyzer", "label": "TypeScript Code Analyzer"}, {"href": "/repository-risk-analysis", "label": "Repository Risk Analysis"}, {"href": "/security-scanner", "label": "Security Scanner"}]}
      faqItems={faqItems}
      nextText="Analyze one critical repository and convert context into a prioritized review and security plan."
      ctas={[{"href": "/chat", "label": "Analyze a GitHub Repository", "primary": true}, {"href": "/ai-code-review-tool", "label": "Open AI Code Review Tool"}, {"href": "/solutions", "label": "Back to Solutions"}]}
      schemas={[breadcrumbSchema, faqSchema, softwareSchema]}
    />
  );
}
