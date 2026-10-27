/** Live guide pages listed on /explore. Kept out of page.tsx because route files may only export Next.js route fields. */
export type TopicEntry = {
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
