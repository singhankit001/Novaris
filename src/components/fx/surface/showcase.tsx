import type { ReactNode } from "react";
import type { ShowcaseEntry } from "../showcase-types";
import { BentoGrid, BentoItem } from "./bento-grid";
import { CometCard } from "./comet-card";
import { ExpandableCards } from "./expandable-cards";
import { GlowingBorder } from "./glowing-border";
import { GooeyInput } from "./gooey-input";
import { LiquidGlass } from "./liquid-glass";
import { MagneticButton } from "./magnetic-button";
import { StickyScrollReveal } from "./sticky-scroll-reveal";
import { Timeline } from "./timeline";
import { TracingBeam } from "./tracing-beam";

const mono = "font-nv-mono text-nv-micro text-nv-ivory-300";

function Frame({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl py-6">{children}</div>;
}

function Lines({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-850 p-4">
      {rows.map(([k, v]) => (
        <p key={k} className={mono}>
          <span className="text-nv-copper-400">{k}</span> {v}
        </p>
      ))}
    </div>
  );
}

function Compare() {
  return (
    <Frame>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Evidence-linked", "Every finding names a file and line, or is labelled inferred."],
          ["Scoped by default", "A scan reads one repository at a time and reports what it could not reach."],
        ].map(([t, d]) => (
          <GlowingBorder key={t}>
            <div className="nv-card h-full p-6">
              <h3 className="text-nv-title font-semibold tracking-[-0.02em]">{t}</h3>
              <p className="mt-2 text-nv-small text-nv-ivory-300">{d}</p>
            </div>
          </GlowingBorder>
        ))}
      </div>
    </Frame>
  );
}

function Bento() {
  return (
    <Frame>
      <BentoGrid>
        <BentoItem
          className="lg:col-span-2"
          href="/explore"
          title="Explore repositories"
          summary="Browse scanned open-source projects by language and risk."
          detail="Filter by language, dependency count or finding type, then open any repository's evidence-linked report."
          header={<Lines rows={[["scope", "public repositories"], ["sort", "recently scanned"], ["filter", "language: TypeScript"]]} />}
        />
        <BentoItem href="/repository-risk-analysis" title="Risk analysis" summary="Where a codebase is most exposed." detail="Findings are grouped by file, with the commit that introduced each one when it can be traced." />
        <BentoItem href="/security-scanner" title="Security scanner" summary="Static checks across your code." detail="Rules cover injection, secrets, unsafe deserialisation and risky dependency ranges." />
        <BentoItem
          className="lg:col-span-2"
          href="/dashboard"
          title="Your dashboard"
          summary="Saved repositories and recent scans in one place."
          detail="Re-run a scan, compare two runs, or export a report you can hand to a reviewer."
          header={<Lines rows={[["last scan", "shown with its real timestamp"], ["status", "queued, running, complete"]]} />}
        />
      </BentoGrid>
    </Frame>
  );
}

function Beam() {
  return (
    <Frame>
      <TracingBeam>
        <article className="max-w-prose space-y-8">
          {["Why types are not enough", "Reading a data flow", "What to fix first"].map((h, i) => (
            <section key={h}>
              <h3 className="nv-display text-nv-display-md">{h}</h3>
              <p className="mt-3 text-nv-body leading-relaxed text-nv-ivory-200 text-pretty">
                {i === 0 && "Strict mode catches shape errors. It does not tell you that a user-controlled string reaches a query builder three calls later. Tracing the value does."}
                {i === 1 && "Start at the source, follow each assignment, and stop at the first sink. Each hop is a file and a line you can open and check yourself."}
                {i === 2 && "Fix findings where untrusted input enters first. One validation at the boundary usually closes several downstream reports at once."}
              </p>
            </section>
          ))}
        </article>
      </TracingBeam>
    </Frame>
  );
}

function Sticky() {
  const panel = (rows: [string, string][]) => (
    <div className="nv-card nv-holo-ring h-full p-6">
      <Lines rows={rows} />
    </div>
  );
  return (
    <Frame>
      <StickyScrollReveal
        steps={[
          { id: "s1", title: "Point it at a repository", body: "Paste a GitHub URL or pick a saved repository. Nothing is cloned until you start the scan.", visual: panel([["input", "github.com/owner/repo"], ["branch", "default"]]) },
          { id: "s2", title: "Watch real stages", body: "Fetching, indexing, analysing. Each stage reports when it actually finishes, never a made-up percentage.", visual: panel([["fetch", "done"], ["index", "done"], ["analyse", "running"]]) },
          { id: "s3", title: "Read findings with evidence", body: "Every finding links the file and line, or is labelled inferred when it comes from a pattern rather than a trace.", visual: panel([["finding", "src/db/query.ts:42"], ["basis", "traced"]]) },
        ]}
      />
    </Frame>
  );
}

function Comet() {
  return (
    <Frame>
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          ["Repository", "owner/example-repo", "A TypeScript service with a public report."],
          ["Repository", "owner/another-repo", "Open the report to see findings and evidence."],
        ].map(([e, t, d]) => (
          <CometCard key={t}>
            <div className="p-6">
              <p className="nv-eyebrow">{e}</p>
              <p className="mt-2 font-nv-mono text-nv-title text-nv-ivory-100">{t}</p>
              <p className="mt-2 text-nv-small text-nv-ivory-300">{d}</p>
            </div>
          </CometCard>
        ))}
      </div>
    </Frame>
  );
}

function Glass() {
  return (
    <Frame>
      <div className="nv-aurora nv-grid-paper rounded-nv-xl p-8 md:p-14">
        <LiquidGlass className="mx-auto max-w-md p-8 text-center">
          <p className="nv-eyebrow">One hero element</p>
          <p className="nv-display mt-2 text-nv-display-md">Lit, not frosted</p>
          <p className="mt-3 text-nv-small text-nv-ivory-300">A specular rim and a highlight that follows the pointer. No backdrop blur.</p>
        </LiquidGlass>
      </div>
    </Frame>
  );
}

function Magnetic() {
  return (
    <Frame>
      <div className="flex flex-wrap items-center gap-6">
        <MagneticButton href="/chat">Analyze a repository</MagneticButton>
        <MagneticButton href="/explore" variant="secondary">
          Explore
        </MagneticButton>
      </div>
    </Frame>
  );
}

function Expandable() {
  return (
    <Frame>
      <ExpandableCards
        items={[
          { id: "e1", eyebrow: "Scope", title: "What does a scan read?", summary: "Only the repository you point it at.", detail: <p>Source files, manifests and lockfiles on the chosen branch. Private repositories need you to grant access first, and the report lists anything it could not read.</p> },
          { id: "e2", eyebrow: "Evidence", title: "How are findings backed up?", summary: "File, line and basis on every one.", detail: <p>A finding is either traced (the data flow is shown) or inferred (a pattern matched). The report labels which, so you know what to verify first.</p> },
          { id: "e3", eyebrow: "Reports", title: "Can I share a report?", summary: "Yes, as a link or an export.", detail: <p>Shared links show the same evidence you see. You can revoke a link from the dashboard at any time.</p> },
          { id: "e4", eyebrow: "Limits", title: "What can it miss?", summary: "Anything that only exists at runtime.", detail: <p>Static analysis cannot see configuration set after deploy or behaviour that depends on live data. Treat a clean report as a baseline, not a guarantee.</p> },
        ]}
      />
    </Frame>
  );
}

function TimelineDemo() {
  return (
    <Frame>
      <Timeline
        entries={[
          { id: "t1", label: "Step 1", title: "Connect", content: <p>Add a repository by URL or from your GitHub account.</p> },
          { id: "t2", label: "Step 2", title: "Scan", content: <p>Stages run in order and report when each one truly completes.</p> },
          { id: "t3", label: "Step 3", title: "Review", content: <p>Open findings, read the evidence, and mark false positives so they stay out of the next report.</p> },
          { id: "t4", label: "Step 4", title: "Re-check", content: <p>Run the scan again after a fix and compare the two reports side by side.</p> },
        ]}
      />
    </Frame>
  );
}

function Gooey() {
  return (
    <Frame>
      <div className="flex min-h-40 items-center justify-center rounded-nv-xl nv-aurora p-6">
        <GooeyInput label="Search repositories" placeholder="Search repositories" />
      </div>
    </Frame>
  );
}

export const surfaceShowcase: ShowcaseEntry[] = [
  { id: "glowing-border", name: "GlowingBorder", reference: "Aceternity Glowing Effect", routes: ["/compare", "/novaris-vs-*", "/security-scanner"], render: () => <Compare /> },
  { id: "bento-grid", name: "BentoGrid", reference: "Aceternity Bento Grid", routes: ["/explore", "/repository-risk-analysis", "/dashboard"], render: () => <Bento /> },
  { id: "tracing-beam", name: "TracingBeam", reference: "Aceternity Tracing Beam", routes: ["/typescript-code-analyzer", "/blog/[slug]"], render: () => <Beam /> },
  { id: "sticky-scroll-reveal", name: "StickyScrollReveal", reference: "Aceternity Sticky Scroll Reveal", routes: ["/solutions"], render: () => <Sticky /> },
  { id: "comet-card", name: "CometCard", reference: "Aceternity Comet Card", routes: ["/trending"], render: () => <Comet /> },
  { id: "liquid-glass", name: "LiquidGlass", reference: "Aceternity Liquid Glass (restrained rewrite)", routes: ["hero surface, one per view"], render: () => <Glass /> },
  { id: "magnetic-button", name: "MagneticButton", reference: "Aceternity Magnetic Button", routes: ["marketing CTAs"], render: () => <Magnetic /> },
  { id: "expandable-cards", name: "ExpandableCards", reference: "Aceternity Expandable Cards", routes: ["/github-code-analyzer", "/nodejs-security-scanner", "/faq", "/report", "/dashboard/repos"], render: () => <Expandable /> },
  { id: "timeline", name: "Timeline", reference: "Aceternity Timeline", routes: ["/solutions", "/dashboard"], render: () => <TimelineDemo /> },
  { id: "gooey-input", name: "GooeyInput", reference: "Aceternity Gooey Input", routes: ["/explore", "/coming-soon"], render: () => <Gooey /> },
];
