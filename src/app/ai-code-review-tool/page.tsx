import type { Metadata } from "next";
import { ReviewExperience } from "@/components/experiences/code-review/ReviewExperience";
import SolutionPage from "@/components/seo/SolutionPage";
import { buildOgImageUrl, createSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/lib/structured-data";

export const metadata: Metadata = createSeoMetadata({
  title: "AI Code Review Tool",
  description:
    "Use Novaris as an AI code review tool to review implementation quality with full repository context, clearer prioritization, and faster feedback loops.",
  canonical: "/ai-code-review-tool",
  keywords: [
    "ai code review tool",
    "context aware code review",
    "repository code review",
    "code review automation",
    "pull request quality tool",
    "github ai reviewer",
  ],
  ogImage: buildOgImageUrl("marketing", { variant: "ai-code-review-tool" }),
  ogTitle: "AI Code Review with Full Repository Context",
  ogDescription:
    "Reduce review blind spots and speed up feedback loops with context-aware repository analysis.",
});

const faqItems = [
  {
    question: "How is this different from reviewing a pull request diff alone?",
    answer:
      "Novaris incorporates repository context so review comments account for architecture and dependency impact beyond the immediate diff.",
  },
  {
    question: "Can this reduce review cycle time?",
    answer:
      "Yes. Teams often reduce cycle time by focusing review attention on high-impact logic and integration paths earlier.",
  },
  {
    question: "Does this work for large codebases with shared modules?",
    answer:
      "Yes. Context-aware analysis helps reviewers understand shared module impact and avoid local-only conclusions.",
  },
  {
    question: "Who should use this workflow first?",
    answer:
      "Engineering leads, senior reviewers, and platform teams usually see the fastest value because they review high-impact changes frequently.",
  },
  {
    question: "Can this complement existing CI quality checks?",
    answer:
      "Yes. CI checks enforce baseline quality, while Novaris strengthens contextual interpretation during review.",
  },
  {
    question: "What is a good success metric after rollout?",
    answer:
      "Track review turnaround time, reopened PR rate, and post-merge defect escape rate for critical repositories.",
  },
];

const breadcrumbSchema = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Solutions", path: "/solutions" },
  { name: "AI Code Review Tool", path: "/ai-code-review-tool" },
]);

const faqSchema = buildFaqStructuredData(faqItems);
const softwareSchema = buildSoftwareApplicationStructuredData({
  name: "Novaris AI Code Review Tool",
  description:
    "Context-aware AI code review workflow for faster, higher-confidence implementation review.",
  path: "/ai-code-review-tool",
  featureList: [
    "Repository-wide review context",
    "Architecture-aware review signals",
    "Dependency impact visibility",
    "Action-oriented review outcomes",
  ],
});

export default function AICodeReviewToolPage() {
  return (
    <SolutionPage
      crumbTitle="AI Code Review Tool"
      heroAlign="center"
      experience={<ReviewExperience />}
      h1="AI Code Review Tool with Full-File Context"
      lead={["Novaris helps engineering teams review code with repository-level context, making it easier to catch high-impact issues before merge and reduce slow, repetitive review cycles.", "Instead of local-only diff reading, this workflow highlights architecture side effects, dependency impact, and probable risk areas so reviewers can focus on what matters first."]}
      visual={{ variant: "review-workflow", ariaLabel: "AI code review workflow from review intent to actionable feedback, illustrative" }}
      mainTitle="How this AI code review workflow works"
      mainIntro="Novaris starts with review intent, then evaluates changes with broader repository context. This helps reviewers understand how a modification may affect behavior in adjacent modules and where regression risk is most likely."
      subsections={[{"title": "Context before comment quality", "text": "Better context improves feedback quality, lowers misprioritized comments, and makes review outcomes easier to action."}, {"title": "Action-ready outcomes for teams", "text": "Teams can move from findings to concrete follow-up tasks with clearer ownership and sequencing."}]}
      cards={[{"title": "Review quality", "text": "Catch hidden dependencies and system-level side effects that are easy to miss in diff-only reviews."}, {"title": "Reviewer productivity", "text": "Spend less time rebuilding context and more time validating critical implementation decisions."}, {"title": "Team consistency", "text": "Standardize how high-risk changes are reviewed across teams and repositories."}, {"title": "Release confidence", "text": "Improve confidence before merge by highlighting areas that need deeper validation."}]}
      relatedTitle="Related review and analysis paths"
      related={[{"href": "/github-repository-analysis", "label": "GitHub Repository Analysis"}, {"href": "/static-analysis-vs-novaris", "label": "Static Analysis vs Novaris"}, {"href": "/security-scanner", "label": "Security Scanner"}, {"href": "/compare", "label": "Comparison Hub"}]}
      faqItems={faqItems}
      nextText="Run context-aware review on your highest-change repository and improve review outcomes this sprint."
      ctas={[{"href": "/chat", "label": "Start AI Code Review", "primary": true}, {"href": "/github-repository-analysis", "label": "Analyze Repository Architecture"}, {"href": "/solutions", "label": "Back to Solutions"}]}
      schemas={[breadcrumbSchema, faqSchema, softwareSchema]}
    />
  );
}
