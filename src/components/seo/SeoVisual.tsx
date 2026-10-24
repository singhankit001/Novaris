import { Badge } from "@/components/nv/badge";
import { ArrowRight, FileCode2, ScanLine, Sparkles } from "lucide-react";

export type SeoVisualVariant =
  | "hero-flow"
  | "analysis-workflow"
  | "review-workflow"
  | "security-workflow"
  | "comparison-grid"
  | "trust-signal";

interface Step {
  label: string;
  detail: string;
}

const FLOWS: Record<SeoVisualVariant, { caption: string; steps: [Step, Step, Step] }> = {
  "hero-flow": {
    caption: "How a question about a repository moves through Novaris.",
    steps: [
      { label: "You provide", detail: "A GitHub repository URL, owner/repo, or username." },
      { label: "Novaris reads", detail: "Public data from the GitHub API: file tree and the files chosen for your question." },
      { label: "You get", detail: "An answer that names the files it relied on." },
    ],
  },
  "analysis-workflow": {
    caption: "Repository analysis from URL to a sourced answer.",
    steps: [
      { label: "You provide", detail: "A repository URL and a question." },
      { label: "Novaris reads", detail: "The file tree, then complete files relevant to the question." },
      { label: "You get", detail: "Architecture notes and diagrams that cite files." },
    ],
  },
  "review-workflow": {
    caption: "Code review questions answered with whole files loaded.",
    steps: [
      { label: "You ask", detail: "A question about a module, function, or change." },
      { label: "Novaris loads", detail: "Complete files, so imports and callers are visible to the model." },
      { label: "You get", detail: "Review notes that point at file paths." },
    ],
  },
  "security-workflow": {
    caption: "Security scan from scope to findings.",
    steps: [
      { label: "You choose", detail: "A repository and a quick or deep scan (deep scans need sign-in)." },
      { label: "Novaris checks", detail: "Pattern checks and model review within a fixed file budget." },
      { label: "You get", detail: "Findings with severity, file and lines. Verify each one." },
    ],
  },
  "comparison-grid": {
    caption: "What a comparison page covers.",
    steps: [
      { label: "Criteria", detail: "Context depth, triage, and what each output lets you do next." },
      { label: "Approach", detail: "How each tool category works and where it is strong." },
      { label: "Fit", detail: "Cases where the tools complement each other." },
    ],
  },
  "trust-signal": {
    caption: "How Novaris labels the source of a statement.",
    steps: [
      { label: "Measured", detail: "Counts and metadata taken directly from GitHub." },
      { label: "Inferred", detail: "Model reasoning over the files it was given." },
      { label: "Not available", detail: "Anything the data does not show is stated as unknown." },
    ],
  },
};

/** A labeled, static illustration. It describes the workflow in text and carries an Illustrative tag. */
export default function SeoVisual({ variant, ariaLabel }: { variant: SeoVisualVariant; ariaLabel: string; sizeMode?: "compact" | "wide"; animate?: boolean; priority?: "low" | "high" }) {
  const flow = FLOWS[variant];
  const icons = [FileCode2, ScanLine, Sparkles];
  return (
    <figure aria-label={ariaLabel} className="m-0 rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-6 shadow-[0_12px_40px_-24px_rgba(24,43,40,0.2)] md:p-8">
      <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-10">
        {flow.steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="relative">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-nv-copper-wash text-nv-copper-400"><Icon aria-hidden className="size-5" strokeWidth={1.6} /></span>
                {i < flow.steps.length - 1 && <ArrowRight aria-hidden className="hidden size-5 text-nv-graphite-500 md:block" />}
              </div>
              <p className="text-nv-body font-semibold text-nv-ivory-50">{step.label}</p>
              <p className="mt-2 text-pretty text-nv-small leading-relaxed text-nv-ivory-200">{step.detail}</p>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-4 flex flex-wrap items-center gap-3 border-t border-nv-graphite-700 pt-3 text-nv-micro text-nv-ivory-300">
        <Badge status="neutral">Illustrative</Badge>
        {flow.caption}
      </figcaption>
    </figure>
  );
}
