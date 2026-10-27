import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { H2 } from "@/components/seo/blocks";
import { CodeComparison } from "@/components/fx/code/code-comparison";
import { FileTree, type TreeNode } from "@/components/fx/code/file-tree";
import { SignalPaths } from "@/components/fx/scene/signal-paths";
import { StickyScrollReveal, type StickyStep } from "@/components/fx/surface/sticky-scroll-reveal";
import { Timeline, type TimelineEntry } from "@/components/fx/surface/timeline";
import DemoVideo from "@/components/media/DemoVideo";

const TREE: TreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/lib",
        name: "lib",
        children: [
          { id: "src/lib/auth.ts", name: "auth.ts", status: "flagged" },
          { id: "src/lib/db.ts", name: "db.ts", status: "context" },
        ],
      },
      { id: "src/middleware.ts", name: "middleware.ts", status: "context" },
    ],
  },
  { id: "prisma", name: "prisma", children: [{ id: "prisma/schema.prisma", name: "schema.prisma" }] },
  { id: "package.json", name: "package.json" },
];

/** Decorative vignette frame: not focusable (the pinned panel is aria-hidden) and labelled as an example. */
function Vignette({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div inert className={`relative h-72 w-full overflow-hidden lg:h-full ${className ?? ""}`}>
      {children}
    </div>
  );
}

const STEPS: StickyStep[] = [
  {
    id: "search",
    title: "Search",
    body: "Paste a GitHub URL or search for a repository by name. Every Novaris workflow starts from the repository itself.",
    visual: (
      <Vignette className="flex flex-col justify-center gap-4">
        <div className="nv-card flex items-center gap-3 px-5 py-4 font-nv-mono text-nv-small text-nv-ivory-100">
          <Search aria-hidden className="size-4 shrink-0 text-nv-graphite-400" />
          <span className="truncate">github.com/owner/repository</span>
        </div>
        <p className="m-0 font-nv-mono text-nv-micro text-nv-ivory-300">Illustrative example</p>
      </Vignette>
    ),
  },
  {
    id: "chat",
    title: "AI chat",
    body: "Ask questions in plain language. Answers cite the files they draw on, so you can check them against the code.",
    visual: (
      <Vignette>
        <DemoVideo name="ai-chat" fill />
      </Vignette>
    ),
  },
  {
    id: "code",
    title: "Explore code",
    body: "Browse the file tree and open any file with full-file context, so answers and findings stay tied to real code.",
    visual: (
      <Vignette className="flex items-center">
        <div className="w-full max-w-sm">
          <FileTree label="Example repository files" nodes={TREE} defaultExpanded={["src", "src/lib"]} defaultSelected="src/lib/auth.ts" />
          <p className="m-0 mt-3 font-nv-mono text-nv-micro text-nv-ivory-300">Illustrative example</p>
        </div>
      </Vignette>
    ),
  },
  {
    id: "architecture",
    title: "Analyze architecture",
    body: "See module boundaries and how the parts connect before you adopt, migrate or review a repository.",
    visual: (
      <Vignette>
        <DemoVideo name="architecture" fill />
      </Vignette>
    ),
  },
  {
    id: "security",
    title: "Security scan",
    body: "Prioritize findings with architecture-aware triage, so likely high-impact risks surface before the rest.",
    visual: (
      <Vignette>
        <DemoVideo name="security-scan" fill />
      </Vignette>
    ),
  },
  {
    id: "report",
    title: "Review and share the report",
    body: "Turn findings into sprint-ready engineering actions, review them with your team, and share the report.",
    visual: (
      <Vignette className="flex flex-col justify-center gap-3">
        <CodeComparison
          filename="src/lib/auth.ts"
          beforeLabel="Finding"
          afterLabel="Suggested fix"
          beforeCode={"const t = readToken(req);\nreturn jwt.decode(t);"}
          afterCode={"const t = readToken(req);\nreturn jwt.verify(t, key);"}
        />
        <p className="m-0 font-nv-mono text-nv-micro text-nv-ivory-300">Illustrative example</p>
      </Vignette>
    ),
  },
];

/** The end-to-end journey: six stages, each stage's text carries the facts, a pinned panel shows a small example. */
export function JourneySection() {
  return (
    <section aria-labelledby="sol-journey-h">
      <div className="max-w-2xl">
        <H2 id="sol-journey-h">From search to a shared report</H2>
        <p className="mt-4 text-nv-lead text-nv-ivory-200 text-pretty">
          One path through a repository: find it, ask about it, read its code, map its architecture, scan it for risk, then review and share what you found.
        </p>
      </div>
      <StickyScrollReveal steps={STEPS} className="mt-8" />
    </section>
  );
}

/** Many files converge into one cited answer. */
export function ConvergeSection() {
  return (
    <section aria-labelledby="sol-converge-h">
      <div className="max-w-2xl">
        <H2 id="sol-converge-h">Many files in, one answer out</H2>
        <p className="mt-4 text-nv-lead text-nv-ivory-200 text-pretty">
          Novaris reads across the repository instead of one file at a time, then points each answer back to the files it used.
        </p>
      </div>
      <div className="mt-10">
        <SignalPaths inputs={["auth.ts", "schema.prisma", "routes/", "package.json", "middleware.ts"]} className="mx-0">
          <span className="nv-card inline-flex items-center px-4 py-2 text-nv-small font-medium text-nv-ivory-50">One cited answer</span>
        </SignalPaths>
        <p className="mt-6 font-nv-mono text-nv-micro text-nv-ivory-300">Illustrative example: file names are not from a real repository.</p>
      </div>
    </section>
  );
}

const CHOOSE: { id: string; label: string; title: string; heading?: string; body: ReactNode }[] = [
  {
    id: "analysis",
    label: "Start",
    title: "Repository analysis",
    body: (
      <p>
        Start with <strong>GitHub Repository Analysis</strong> when the primary challenge is understanding architecture and module relationships. This is the best first move for onboarding, due diligence, or migration planning.
      </p>
    ),
  },
  {
    id: "review",
    label: "Then",
    title: "AI code review",
    heading: "Use AI Code Review Tool when review quality is the bottleneck",
    body: (
      <p>
        If pull requests are slow or recurring issues slip through, move into the AI Code Review workflow to prioritize high-impact review topics with richer repository context.
      </p>
    ),
  },
  {
    id: "security",
    label: "Finally",
    title: "Security scanner",
    heading: "Use Security Scanner when triage speed matters most",
    body: (
      <p>
        When security findings outpace remediation capacity, Security Scanner helps teams focus on likely high-impact risks and convert findings into sprint-ready engineering actions.
      </p>
    ),
  },
];

const CHOOSE_ENTRIES: TimelineEntry[] = CHOOSE.map((c) => ({
  id: c.id,
  label: c.label,
  title: c.title,
  content: (
    <div className="space-y-2">
      {c.heading ? <p className="m-0 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{c.heading}</p> : null}
      <div className="max-w-prose text-pretty [&_p]:m-0">{c.body}</div>
    </div>
  ),
}));

export function ChooseTimeline() {
  return <Timeline entries={CHOOSE_ENTRIES} />;
}
