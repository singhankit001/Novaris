import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";

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

function Fragment({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className={s.fragment} aria-hidden>
        <div className={cn(s.fragRow, s.fragRowOn)}>owner/repo</div>
        <div className={cn(s.fragBar, "w-[72%]")} />
        <div className={cn(s.fragBar, "w-[48%]")} />
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className={s.fragment} aria-hidden>
        <div className={s.fragRow}>src/app/page.tsx</div>
        <div className={cn(s.fragRow, s.fragRowOn)}>src/lib/auth.ts</div>
        <div className={s.fragRow}>prisma/schema.prisma</div>
      </div>
    );
  }
  return (
    <div className={s.fragment} aria-hidden>
      <div className={cn(s.fragBar, "w-[92%]")} />
      <div className={cn(s.fragBar, "w-[64%]")} />
      <div className={cn(s.fragRow, s.fragRowOn)}>src/lib/auth.ts#L12-40</div>
    </div>
  );
}

/** A labeled, static illustration. It describes the workflow in text and carries an Illustrative tag. */
export default function SeoVisual({ variant, ariaLabel }: { variant: SeoVisualVariant; ariaLabel: string; sizeMode?: "compact" | "wide"; animate?: boolean; priority?: "low" | "high" }) {
  const flow = FLOWS[variant];
  return (
    <figure aria-label={ariaLabel} className={s.vis}>
      <div aria-hidden className={cn(s.visBg, "nv-aurora")} />
      <svg aria-hidden className={s.visLine} viewBox="0 0 100 2" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="visGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#2f54ff" />
            <stop offset="0.55" stopColor="#7a4dff" />
            <stop offset="1" stopColor="#19b6e6" />
          </linearGradient>
        </defs>
        <path d="M0 1H100" vectorEffect="non-scaling-stroke" />
      </svg>
      <ol className={s.visSteps}>
        {flow.steps.map((step, i) => (
          <li key={step.label} className={s.station}>
            <div className={s.stationNode}>
              <span className={cn(s.stationNum, "nv-num")}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.stationLabel}>{step.label}</span>
            </div>
            <Fragment index={i} />
            <p className={s.stationText}>{step.detail}</p>
          </li>
        ))}
      </ol>
      <figcaption className={s.visCaption}>
        <span className={s.tag}>Illustrative</span>
        {flow.caption}
      </figcaption>
    </figure>
  );
}
