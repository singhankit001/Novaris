"use client";

import { useState, type ReactNode } from "react";
import { FileSearch, Layers } from "lucide-react";
import { CodeBlock } from "@/components/fx/code/code-block";
import { CodeComparison } from "@/components/fx/code/code-comparison";
import { Terminal, type TerminalLine } from "@/components/fx/code/terminal";
import { cn } from "@/components/nv/cn";
import { ExpandableCards, type ExpandableItem } from "@/components/fx/surface/expandable-cards";
import { Basis, IllustrativeTag } from "../IllustrativeTag";

const RETRY_TS = `import { config } from "@/config/queue";
import { backoff, sleep } from "./backoff";

export async function withRetry<T>(job: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await job();
    } catch (err) {
      if (attempt >= config.maxAttempts) throw err;
      await sleep(backoff(attempt));
    }
  }
}
`;

type Mode = "file" | "repo";

const NOTES: Record<Mode, Record<number, ReactNode>> = {
  file: {
    4: "A generic retry wrapper",
    9: "maxAttempts comes from a file not read yet",
    10: "backoff() is not visible here",
  },
  repo: {
    4: "2 callers: jobs/receipts.ts:18, webhooks/sync.ts:9",
    9: "config/queue.ts:4 sets maxAttempts to 3",
    10: "backoff.ts caps the delay at 30 seconds",
  },
};

const TRANSCRIPT: Record<Mode, TerminalLine[]> = {
  file: [
    { kind: "command", text: "novaris explain src/lib/queue/retry.ts" },
    { kind: "output", text: "reading retry.ts (13 lines)" },
    { kind: "warn", text: "config/queue and ./backoff not read" },
    { kind: "warn", text: "callers not searched" },
  ],
  repo: [
    { kind: "command", text: "novaris explain src/lib/queue/retry.ts" },
    { kind: "output", text: "reading retry.ts (13 lines)" },
    { kind: "output", text: "following imports: config/queue.ts, queue/backoff.ts" },
    { kind: "output", text: "searching callers of withRetry" },
    { kind: "success", text: "2 callers: jobs/receipts.ts, webhooks/sync.ts" },
    { kind: "output", text: "reading tests: queue/retry.test.ts" },
    { kind: "success", text: "context ready: 6 files" },
  ],
};

const ANALYSIS: Record<Mode, { claim: string; basis: "Measured" | "Inferred"; text: string }[]> = {
  file: [
    { claim: "What it does", basis: "Inferred", text: "Retries a job until it succeeds or a limit is reached." },
    { claim: "Is it safe to raise the limit?", basis: "Inferred", text: "Unknown. The limit and the delay live in files this answer never read." },
  ],
  repo: [
    { claim: "What it does", basis: "Measured", text: "Retries up to 3 attempts (config/queue.ts:4) with a delay capped at 30 seconds (backoff.ts)." },
    { claim: "Is it safe to raise the limit?", basis: "Inferred", text: "Probably not for jobs/receipts.ts:18. It retries sendReceipt, which is not idempotent, so more attempts could send duplicate receipts." },
  ],
};

const ANSWER_FILE = `Q: Can I raise withRetry's attempts?

Answer from retry.ts alone:
  It is a generic wrapper, so
  raising the limit looks fine.
  The limit and delay are not visible.
`;
const ANSWER_REPO = `Q: Can I raise withRetry's attempts?

Answer with repository context:
  Not for receipts. jobs/receipts.ts:18
  retries sendReceipt, which is not
  idempotent. Raise it for sync.ts only.
`;

const ITEMS: ExpandableItem[] = [
  {
    id: "callers",
    eyebrow: "Callers",
    title: "Who depends on this function",
    summary: "Importers and call sites turn a generic helper into specific behaviour.",
    detail: (
      <ul className="m-0 grid list-none gap-1.5 p-0 font-nv-mono text-nv-micro">
        <li>jobs/receipts.ts:18 wraps sendReceipt</li>
        <li>webhooks/sync.ts:9 wraps pullAccounts</li>
      </ul>
    ),
  },
  {
    id: "config",
    eyebrow: "Config",
    title: "Where the numbers come from",
    summary: "Limits and timeouts are rarely in the file that uses them.",
    detail: <p className="m-0">config/queue.ts:4 sets maxAttempts to 3. backoff.ts doubles the delay and stops at 30 seconds.</p>,
  },
  {
    id: "types",
    eyebrow: "Types",
    title: "What the generic really carries",
    summary: "Resolving T through the callers shows which payloads pass through.",
    detail: <p className="m-0">T resolves to void for sendReceipt and to Account[] for pullAccounts. Neither call site narrows the thrown error.</p>,
  },
  {
    id: "tests",
    eyebrow: "Tests",
    title: "What is already covered",
    summary: "Existing tests show intended behaviour and the gaps around it.",
    detail: <p className="m-0">queue/retry.test.ts covers the success and give-up paths. No test exercises a non-idempotent job.</p>,
  },
];

function Seg({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-nv-sm px-4 text-nv-small transition-colors sm:flex-none",
        on ? "bg-nv-copper-400 font-medium text-white shadow-nv-xs" : "text-nv-ivory-200 hover:bg-nv-graphite-800",
      )}
    >
      <span aria-hidden className="size-4 [&>svg]:size-full">{icon}</span>
      {children}
    </button>
  );
}

export function AnalyzerExperience(): ReactNode {
  const [mode, setMode] = useState<Mode>("file");
  const repo = mode === "repo";
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-nv-lg border border-nv-graphite-700 bg-white p-3 shadow-nv-card">
        <div role="group" aria-label="Analysis scope" className="flex w-full gap-1 rounded-nv-md bg-nv-graphite-850 p-1 sm:w-auto">
          <Seg on={!repo} onClick={() => setMode("file")} icon={<FileSearch />}>Without repository context</Seg>
          <Seg on={repo} onClick={() => setMode("repo")} icon={<Layers />}>With repository context</Seg>
        </div>
        <IllustrativeTag>Sample repository written for this page. Not output from a Novaris run.</IllustrativeTag>
      </div>
      <p aria-live="polite" className="sr-only">{repo ? "Showing analysis with repository context" : "Showing analysis of the file alone"}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <CodeBlock key={mode} tabs={[{ filename: "src/lib/queue/retry.ts", code: RETRY_TS, highlight: repo ? [9] : [], annotations: NOTES[mode] }]} />
        <div className="grid min-w-0 gap-4">
          <Terminal key={mode} title={repo ? "novaris · repository scope" : "novaris · file only"} lines={TRANSCRIPT[mode]} />
          <section aria-label="Analysis" className="rounded-nv-md border border-nv-graphite-700 bg-white p-4 shadow-nv-card">
            <ul className="m-0 grid list-none gap-3 p-0">
              {ANALYSIS[mode].map((a) => (
                <li key={a.claim} className="grid gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-nv-small font-semibold text-nv-ivory-100">{a.claim} <Basis kind={a.basis} /></span>
                  <span className="text-nv-small leading-relaxed text-nv-ivory-200">{a.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div>
        <h3 className="m-0 mb-3 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">The answer changes with the context</h3>
        <CodeComparison filename="Question: raise withRetry attempts?" lang="text" beforeLabel="File only" afterLabel="Repository" beforeCode={ANSWER_FILE} afterCode={ANSWER_REPO} removedLines={[4, 5, 6]} addedLines={[4, 5, 6]} />
      </div>

      <div>
        <h3 className="m-0 mb-3 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">What repository context reveals</h3>
        <ExpandableCards items={ITEMS} />
      </div>
    </div>
  );
}
