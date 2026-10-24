"use client";
import { useState } from "react";
import { Button } from "@/components/nv/button";
import { Notice } from "@/components/nv/notice";
import { AnalysisTransition } from "@/components/atlas/AnalysisTransition";
import { IllustrativeAtlas } from "@/components/atlas/IllustrativeAtlas";
import { RepositoryAtlas } from "@/components/atlas/RepositoryAtlas";
import type { AtlasEdge, AtlasPhase, AtlasTreeEntry, MotionPreference } from "@/components/atlas/types";

// FIXTURE DATA: deterministic, development only. Not a real repository.
const dirs: Record<string, number> = { src: 90, tests: 24, docs: 12, scripts: 6, ".github": 3 };
const tree: AtlasTreeEntry[] = [
  { path: "README.md", type: "blob", size: 2400, language: "Markdown" },
  { path: "package.json", type: "blob", size: 1800, language: "JSON" },
  ...Object.entries(dirs).flatMap(([d, n]) =>
    Array.from({ length: n }, (_, i) => ({
      path: `${d}/fixture-file-${String(i + 1).padStart(3, "0")}.ts`,
      type: "blob" as const,
      size: i % 7 === 0 ? undefined : 400 + i * 130,
      language: "TypeScript",
    })),
  ),
];
const edges: AtlasEdge[] = [
  { from: "src/fixture-file-001.ts", to: "src/fixture-file-014.ts", kind: "cited", evidence: { source: "Fixture answer 1", detail: "Both files quoted in the same fixture answer" } },
  { from: "src/fixture-file-001.ts", to: "tests/fixture-file-003.ts", kind: "cited", evidence: { source: "Fixture answer 1" } },
  { from: "docs/fixture-file-002.ts", to: "src/fixture-file-020.ts", kind: "cited", evidence: { source: "Fixture answer 2" } },
];
const phases: AtlasPhase[] = ["idle", "acquiring", "analyzing", "complete", "failed"];
const prefs: MotionPreference[] = ["system", "reduced", "full"];

export default function AtlasFixture() {
  const [phase, setPhase] = useState<AtlasPhase>("complete");
  const [motion, setMotion] = useState<MotionPreference>("system");
  const [sel, setSel] = useState<string | undefined>();
  const [painted, setPainted] = useState("");
  // Marks the second animation frame after a click: the INP proxy read by the measurement script.
  const press = (name: string, fn: () => void) => () => {
    fn();
    requestAnimationFrame(() => requestAnimationFrame(() => setPainted(`${name} ${performance.now().toFixed(0)}`)));
  };
  return (
    <main className="mx-auto max-w-[var(--nv-page-max)] space-y-8 px-[var(--nv-gutter)] py-8">
      <h1 className="font-nv-display text-nv-display-md text-nv-ivory-50">Atlas fixture</h1>
      <Notice tone="warning" title="Fixture data">Everything below is generated fixture data for development. Not a real repository.</Notice>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Phase">
        {phases.map((p) => (
          <Button key={p} variant={p === phase ? "primary" : "secondary"} aria-pressed={p === phase} data-phase={p} onClick={press(p, () => setPhase(p))}>{p}</Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Motion preference">
        {prefs.map((p) => (
          <Button key={p} variant={p === motion ? "primary" : "secondary"} aria-pressed={p === motion} data-motion={p} onClick={() => setMotion(p)}>motion: {p}</Button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite" data-testid="painted">{painted}</p>
      <section aria-labelledby="h-repo" className="space-y-3">
        <h2 id="h-repo" className="text-nv-title text-nv-ivory-50">RepositoryAtlas (data-backed)</h2>
        <RepositoryAtlas tree={tree} edges={edges} phase={phase} identity={{ owner: "fixture-owner", repo: "fixture-repo" }} selectedPath={sel} onSelect={setSel} motion={motion} />
      </section>
      <section aria-labelledby="h-ill" className="space-y-3">
        <h2 id="h-ill" className="text-nv-title text-nv-ivory-50">IllustrativeAtlas (landing)</h2>
        <IllustrativeAtlas motion={motion} />
      </section>
      <section aria-labelledby="h-tr" className="space-y-3">
        <h2 id="h-tr" className="text-nv-title text-nv-ivory-50">AnalysisTransition (driven by the phase above)</h2>
        <AnalysisTransition
          phase={phase}
          motion={motion}
          identity={<span className="rounded-nv-sm border border-nv-graphite-600 px-3 py-1.5 font-mono text-nv-body text-nv-ivory-50">fixture-owner/fixture-repo</span>}
          atlas={<div className="rounded-nv-md border border-nv-graphite-700 p-4 text-nv-small text-nv-ivory-200">Atlas slot (fixture placeholder)</div>}
          failure={<Notice tone="danger" title="Fixture failure">Recovery action would go here.</Notice>}
        >
          {phase === "complete"
            ? ["Evidence group 1", "Evidence group 2", "Evidence group 3"].map((t) => (
                <p key={t} className="text-nv-body text-nv-ivory-100">{t} (fixture)</p>
              ))
            : null}
        </AnalysisTransition>
      </section>
    </main>
  );
}
