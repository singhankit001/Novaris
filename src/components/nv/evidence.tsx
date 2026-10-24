import type { ReactNode } from "react";
import { FileCode2, GitCommitHorizontal } from "lucide-react";
import { BasisTag } from "./badge";
import { cn } from "./cn";

export interface CitationProps {
  kind: "file" | "commit";
  /** path (file) or short sha (commit) */
  target: string;
  /** line range e.g. "42-58" */
  lines?: string;
  repo?: string;
  href?: string;
  className?: string;
}

/** Evidence chip: every claim in analysis output links to a file or commit. */
export function Citation({ kind, target, lines, repo, href, className }: CitationProps) {
  const Icon = kind === "file" ? FileCode2 : GitCommitHorizontal;
  const text = `${repo ? `${repo}:` : ""}${target}${lines ? `#L${lines}` : ""}`;
  const cls = cn(
    "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-nv-xs border border-nv-copper-600 bg-nv-copper-wash px-2 py-1 font-mono text-nv-micro text-nv-copper-300",
    href && "hover:border-nv-copper-400 hover:text-nv-copper-300",
    className,
  );
  const inner = (
    <>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </>
  );
  return href ? (
    <a href={href} className={cls} aria-label={`${kind === "file" ? "File" : "Commit"} ${text}`}>
      {inner}
    </a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

export interface EvidenceScope {
  identity: string;
  repos: { included: number; total: number; excluded?: string };
  dateRange: string;
  freshness: string;
  limits: string[];
  measured: string[];
  inferred: string[];
  uncertainty?: string;
}

/**
 * The scope card shown above every analysis result. It states what was and was not looked at
 * before the reader sees any conclusion.
 */
export function EvidencePanel({ scope, actions, className }: { scope: EvidenceScope; actions?: ReactNode; className?: string }) {
  const rows: [string, ReactNode][] = [
    ["Subject", scope.identity],
    [
      "Repositories",
      <span key="r" className="nv-num">
        {scope.repos.included} of {scope.repos.total} included{scope.repos.excluded ? `. ${scope.repos.excluded}` : ""}
      </span>,
    ],
    ["Date range", scope.dateRange],
    ["Data freshness", scope.freshness],
  ];
  return (
    <section aria-labelledby="nv-evidence-h" className={cn("rounded-nv-md border border-nv-copper-600/60 bg-nv-graphite-900", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-nv-graphite-700 px-4 py-2.5">
        <h3 id="nv-evidence-h" className="nv-eyebrow !text-nv-copper-300">
          Evidence scope
        </h3>
        {actions}
      </header>
      <dl className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="nv-eyebrow">{k}</dt>
            <dd className="m-0 text-nv-body text-nv-ivory-100">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 border-t border-nv-graphite-700 p-4 md:grid-cols-3">
        <Group title="Collection limits" items={scope.limits} />
        <Group title="Measured" basis="measured" items={scope.measured} />
        <Group title="Inferred" basis="inferred" items={scope.inferred} />
      </div>
      {scope.uncertainty && (
        <p className="border-t border-nv-graphite-700 px-4 py-3 text-nv-small text-nv-ivory-200">
          <strong className="font-medium text-nv-warning">Uncertainty. </strong>
          {scope.uncertainty}
        </p>
      )}
    </section>
  );
}

function Group({ title, items, basis }: { title: string; items: string[]; basis?: "measured" | "inferred" }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="text-nv-small font-medium text-nv-ivory-100">{title}</h4>
        {basis && <BasisTag basis={basis} />}
      </div>
      <ul className="list-disc space-y-1 pl-4 text-nv-small text-nv-ivory-200 marker:text-nv-graphite-500">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li>None recorded</li>}
      </ul>
    </div>
  );
}
