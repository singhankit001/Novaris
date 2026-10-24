"use client";

import { ChevronDown, ShieldAlert } from "lucide-react";
import type { ReportFindingView } from "@/lib/services/report-service";
import { BasisTag, StatusPill } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { CodeBlock } from "@/components/nv/code-block";
import { Citation } from "@/components/nv/evidence";
import { confidenceLabel, findingBasis, severityLabel, severityStatus, verificationText } from "./finding-meta";
import { buildFileHref, parseSnippet } from "./snippet";

interface FindingCardProps {
    view: ReportFindingView;
    owner: string;
    repo: string;
    falsePositive: "idle" | "pending" | "submitted";
    onReportFalsePositive: () => void;
}

const evidenceLabel = { source: "Source", sink: "Sink", sanitizer: "Sanitizer", context: "Context" } as const;
const traceLabel = { source: "Trace source", flow: "Trace flow", sink: "Trace sink" } as const;

export default function FindingCard({ view, owner, repo, falsePositive, onReportFalsePositive }: FindingCardProps) {
    const { finding } = view;
    const evidence = (finding.evidence ?? []).slice(0, 6);
    const signals = (finding.verificationSignals ?? []).slice(0, 6);
    const trace = (finding.trace ?? []).slice(0, 6);
    const parsed = finding.snippet ? parseSnippet(finding.snippet) : null;
    const hasStructured = evidence.length + signals.length + trace.length > 0;
    const startsOpen = finding.severity === "critical" || finding.severity === "high";

    return (
        <li className="overflow-hidden rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 [break-inside:avoid]">
            <details open={startsOpen} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 p-5 transition-colors hover:bg-nv-graphite-850 focus-visible:outline-2 focus-visible:outline-nv-copper-400 [&::-webkit-details-marker]:hidden">
                    <ChevronDown aria-hidden className="mt-1 size-4 shrink-0 text-nv-ivory-300 transition-transform duration-150 motion-reduce:transition-none group-open:rotate-180" />
                    <span className="min-w-0 flex-1 space-y-2">
                        <span className="flex flex-wrap items-center gap-2">
                            <StatusPill status={severityStatus[finding.severity]}>{severityLabel[finding.severity]}</StatusPill>
                            <BasisTag basis={findingBasis(finding)} />
                            <span className="font-mono text-nv-micro text-nv-ivory-300">{finding.type}</span>
                        </span>
                        <span className="block text-nv-body font-medium text-nv-ivory-50">{finding.title}</span>
                        <span className="block text-nv-small text-nv-ivory-300">{verificationText(finding)}</span>
                    </span>
                </summary>

                <div className="space-y-6 border-t border-nv-graphite-700 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Citation
                            kind="file"
                            target={finding.file}
                            lines={finding.line ? String(finding.line) : undefined}
                            repo={`${owner}/${repo}`}
                            href={buildFileHref(owner, repo, finding.file, finding.line)}
                        />
                        {finding.cwe && <span className="font-mono text-nv-micro text-nv-ivory-300">{finding.cwe}</span>}
                        {finding.cvss && <span className="nv-num text-nv-micro text-nv-ivory-300">CVSS {finding.cvss}</span>}
                    </div>

                    <dl className="grid gap-x-8 gap-y-3 text-nv-small sm:grid-cols-3">
                        <div>
                            <dt className="nv-eyebrow">Confidence</dt>
                            <dd className="m-0 text-nv-ivory-100">{finding.confidence ? confidenceLabel[finding.confidence] : "Not scored"}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Exploitability</dt>
                            <dd className="m-0 text-nv-ivory-100">{finding.exploitabilityTag && finding.exploitabilityTag !== "unknown" ? `${finding.exploitabilityTag} (inferred)` : "Not assessed"}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Source</dt>
                            <dd className="m-0 text-nv-ivory-100">{finding.engine ?? "scanner"}{finding.ruleId ? ` / ${finding.ruleId}` : ""}</dd>
                        </div>
                    </dl>

                    <section aria-label="Impact">
                        <h4 className="nv-eyebrow mb-1.5">Impact (inferred)</h4>
                        <p className="m-0 text-nv-body text-pretty text-nv-ivory-100">{view.impact}</p>
                    </section>

                    <section aria-label="Recommendation">
                        <h4 className="nv-eyebrow mb-1.5">Recommendation</h4>
                        <p className="m-0 text-nv-body text-pretty text-nv-ivory-100">{finding.recommendation}</p>
                    </section>

                    {(hasStructured || view.proof) && (
                        <section aria-label="Evidence">
                            <h4 className="nv-eyebrow mb-2">Evidence</h4>
                            {hasStructured && (
                                <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
                                    {evidence.map((e, i) => (
                                        <li key={`e${i}`} className="rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-850 p-3">
                                            <p className="nv-eyebrow">{evidenceLabel[e.type] ?? "Context"}</p>
                                            <p className="m-0 mt-1 text-nv-small text-nv-ivory-100">{e.message}</p>
                                            <p className="nv-num m-0 mt-1 text-nv-micro text-nv-ivory-300">{typeof e.line === "number" ? `Line ${e.line}` : "Line not recorded"}</p>
                                        </li>
                                    ))}
                                    {signals.map((s, i) => (
                                        <li key={`s${i}`} className="rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-850 p-3">
                                            <p className="nv-eyebrow">Verifier check: {s.passed ? "passed" : "failed"}</p>
                                            <p className="m-0 mt-1 text-nv-small text-nv-ivory-100">{s.name}</p>
                                            <p className="m-0 mt-1 text-nv-micro text-nv-ivory-300">{s.detail}</p>
                                        </li>
                                    ))}
                                    {trace.map((t, i) => (
                                        <li key={`t${i}`} className="rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-850 p-3">
                                            <p className="nv-eyebrow">{traceLabel[t.type] ?? "Trace"}</p>
                                            <p className="m-0 mt-1 text-nv-small text-nv-ivory-100">{t.detail}</p>
                                            <p className="nv-num m-0 mt-1 text-nv-micro text-nv-ivory-300">{typeof t.line === "number" ? `Line ${t.line}` : "Line not recorded"}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {!hasStructured && <p className="m-0 text-nv-small text-nv-ivory-300">No structured evidence was recorded for this finding.</p>}
                            <details className="mt-3">
                                <summary className="inline-flex min-h-11 cursor-pointer items-center text-nv-small text-nv-copper-400 hover:text-nv-copper-300">
                                    How this was decided
                                </summary>
                                <pre className="m-0 mt-2 whitespace-pre-wrap rounded-nv-sm bg-nv-graphite-850 p-3 font-mono text-nv-micro text-nv-ivory-200">{view.proof}</pre>
                                <p className="mt-2 text-nv-micro text-nv-ivory-300">{view.confidenceRationale}</p>
                                {finding.verificationRationale && <p className="mt-1 text-nv-micro text-nv-ivory-300">Verification: {finding.verificationRationale}</p>}
                            </details>
                        </section>
                    )}

                    {finding.snippet && (
                        <section aria-label="Code context">
                            <h4 className="nv-eyebrow mb-2">Code context</h4>
                            {parsed ? (
                                <CodeBlock
                                    code={parsed.code}
                                    path={finding.file}
                                    language={finding.file.split(".").pop() || "text"}
                                    startLine={parsed.startLine}
                                    highlight={finding.line ? [finding.line] : []}
                                />
                            ) : (
                                <figure className="m-0 overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-950">
                                    <figcaption className="border-b border-nv-graphite-700 bg-nv-graphite-850 px-3 py-2 text-nv-micro text-nv-ivory-300">
                                        Snippet as reported by the scanner. Line numbers were not recorded.
                                    </figcaption>
                                    <div role="region" tabIndex={0} aria-label={`Code from ${finding.file}`} className="overflow-auto">
                                        <pre className="m-0 min-w-max p-3 font-mono text-[0.8125rem] leading-6 text-nv-ivory-100">
                                            <code>{finding.snippet}</code>
                                        </pre>
                                    </div>
                                </figure>
                            )}
                        </section>
                    )}

                    <div className="print:hidden">
                        <Button
                            leading={<ShieldAlert aria-hidden className="size-4" />}
                            onClick={onReportFalsePositive}
                            disabled={falsePositive !== "idle"}
                            loading={falsePositive === "pending"}
                        >
                            {falsePositive === "submitted" ? "False positive reported" : falsePositive === "pending" ? "Submitting" : "Report false positive"}
                        </Button>
                    </div>
                </div>
            </details>
        </li>
    );
}
