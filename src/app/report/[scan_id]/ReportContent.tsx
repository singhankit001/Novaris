"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReportFalsePositiveReason } from "@prisma/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy, Download, MessageCircle, Printer, Search, Wrench } from "lucide-react";
import type { StoredScan } from "@/lib/services/scan-storage";
import type { PriorScanDiff, ReportFindingView } from "@/lib/services/report-service";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import { submitReportFalsePositive, trackReportConversion } from "@/app/actions";
import { DEEP_SCAN_PROMPT } from "@/lib/chat-constants";
import { formatReportCountdown, getReportExpiryState } from "@/app/report/report-expiry";
import { StatusPill } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";
import { StackedBar, type StackedSegment } from "@/components/nv/charts";
import { Metric, MetricGroup } from "@/components/nv/data";
import { Dialog } from "@/components/nv/dialog";
import { EvidencePanel, type EvidenceScope } from "@/components/nv/evidence";
import { Input, Textarea } from "@/components/nv/field";
import { Notice, type NoticeTone } from "@/components/nv/notice";
import { EmptyState } from "@/components/nv/states";
import FindingCard from "./FindingCard";
import ShareControls from "./ShareControls";
import { SEVERITIES, falsePositiveReasonOptions, severityLabel, severityStatus, type Severity } from "./finding-meta";
import { downloadMarkdownReport, openPrintDialog } from "./export-report";

interface ReportContentProps {
    scan: StoredScan;
    priorScanDiff: PriorScanDiff;
    topFixes: ReportFindingView[];
    findingViews: ReportFindingView[];
    globalFixPrompt: string;
    globalChatHref: string;
    hasPreviousScan: boolean;
    isSharedView: boolean;
    /** Share token of the shared view; the server checks it before accepting feedback. */
    shareToken?: string;
    canShareReport: boolean;
    canGenerateOutreach: boolean;
    shareMode: "canonical" | "copy-current-url";
    reportExpiresAt: number;
}

interface Feedback {
    tone: NoticeTone;
    title: string;
    text?: string;
}

const segmentTone: Record<Severity, StackedSegment["tone"]> = {
    critical: "copper",
    high: "copper",
    medium: "patina",
    low: "ivory",
    info: "graphite",
};

const fmtDateTime = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

async function copyText(value: string): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}

export function ReportContent({
    scan,
    priorScanDiff,
    topFixes,
    findingViews,
    globalFixPrompt,
    hasPreviousScan,
    isSharedView,
    shareToken,
    canShareReport,
    canGenerateOutreach,
    shareMode,
    reportExpiresAt,
}: ReportContentProps) {
    const router = useRouter();
    const baseUrl = getCanonicalSiteUrl();
    const defaultReportUrl = `${baseUrl}/report/${scan.id}`;
    const [now, setNow] = useState(() => Date.now());
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [showFixPrompt, setShowFixPrompt] = useState(false);
    const [showDeepScan, setShowDeepScan] = useState(false);
    const [deepScanInput, setDeepScanInput] = useState("");
    const [deepScanError, setDeepScanError] = useState<string | null>(null);
    const [fpStatus, setFpStatus] = useState<Record<string, "pending" | "submitted">>({});
    const [fpKey, setFpKey] = useState<string | null>(null);
    const [fpReason, setFpReason] = useState<ReportFalsePositiveReason>("NOT_A_VULNERABILITY");
    const [fpDetails, setFpDetails] = useState("");
    const [fpError, setFpError] = useState<string | null>(null);
    const shareableUrl = useSyncExternalStore(
        () => () => {},
        () => window.location.href || defaultReportUrl,
        () => defaultReportUrl,
    );

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const isOutdated = getReportExpiryState(reportExpiresAt, now).isExpired;
    const countdown = formatReportCountdown(reportExpiresAt, now);
    const repoChatHref = `/chat?q=${encodeURIComponent(`${scan.owner}/${scan.repo}`)}`;
    const repoProfileHref = `/repo/${scan.owner}/${scan.repo}`;
    const scanned = new Date(scan.timestamp);

    const counts = SEVERITIES.map((s) => ({ severity: s, count: scan.summary[s] || 0 }));
    const segments: StackedSegment[] = counts.filter((c) => c.count > 0).map((c) => ({ label: severityLabel[c.severity], value: c.count, tone: segmentTone[c.severity] }));
    const grouped = SEVERITIES.map((s) => ({ severity: s, views: findingViews.filter((v) => v.finding.severity === s) })).filter((g) => g.views.length > 0);
    const shownTotal = findingViews.length;
    const recordedTotal = scan.summary.total;
    const hiddenCount = Math.max(0, recordedTotal - shownTotal);
    const dbg = scan.summary.debug;

    const scope: EvidenceScope = {
        identity: `${scan.owner}/${scan.repo}`,
        repos: { included: 1, total: 1 },
        dateRange: `Single scan, ${fmtDateTime(scan.timestamp)}`,
        freshness: isOutdated ? `Outdated. Expired ${fmtDateTime(reportExpiresAt)}` : `Scanned ${fmtDateTime(scan.timestamp)}. Expires ${fmtDateTime(reportExpiresAt)}`,
        limits: [
            scan.depth === "deep" ? "Deep scan" : "Quick scan: fewer checks than a deep scan",
            dbg ? `${dbg.filesSuccessfullyFetched} of ${dbg.filesReceived} candidate files fetched` : "File coverage was not recorded for this scan",
            hiddenCount > 0 ? `${hiddenCount} recorded finding${hiddenCount === 1 ? "" : "s"} hidden because verification did not confirm them` : "Findings failing verification are hidden",
        ],
        measured: ["Findings matched by scanner rules at the cited file and line", "Severity counts as stored with the scan"],
        inferred: ["Impact statements", "Exploitability tags", "Findings not confirmed by the verifier"],
        uncertainty: "Automated scanning produces false positives and misses issues. Use Report false positive when a finding is wrong.",
    };

    const snippet = `Novaris security report for ${scan.owner}/${scan.repo}, scanned ${scanned.toLocaleDateString()}: ${counts.map((c) => `${c.count} ${c.severity}`).join(", ")}. ${shareableUrl}`;

    async function copyWithFeedback(value: string, what: string, event?: "report_fix_prompt_copied") {
        const ok = await copyText(value);
        if (ok && event) void trackReportConversion(event, scan.id);
        setFeedback(ok ? { tone: "success", title: `${what} copied` } : { tone: "warning", title: "Clipboard is blocked", text: "Select the text and copy it manually." });
        return ok;
    }

    function launchDeepScan() {
        const normalized = deepScanInput
            .trim()
            .replace(/^https?:\/\/github\.com\//i, "")
            .replace(/\/+$/, "")
            .replace(/\.git$/i, "");
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
            setDeepScanError("Use the format owner/repo or a github.com URL.");
            return;
        }
        router.push(`/chat?q=${encodeURIComponent(normalized)}&prompt=${encodeURIComponent(DEEP_SCAN_PROMPT)}`);
    }

    const activeView = fpKey ? findingViews.find((v) => `${v.fingerprint}:${v.index}` === fpKey) ?? null : null;
    const fpPending = fpKey ? fpStatus[fpKey] === "pending" : false;

    function closeFp() {
        setFpKey(null);
        setFpReason("NOT_A_VULNERABILITY");
        setFpDetails("");
        setFpError(null);
    }

    async function submitFp() {
        if (!activeView || !fpKey) return;
        const key = fpKey;
        setFpError(null);
        setFpStatus((s) => ({ ...s, [key]: "pending" }));
        try {
            await submitReportFalsePositive({
                scanId: scan.id,
                findingIndex: activeView.index,
                findingFingerprint: activeView.fingerprint,
                shareToken: isSharedView ? shareToken : undefined,
                reason: fpReason,
                details: fpDetails,
            });
            setFpStatus((s) => ({ ...s, [key]: "submitted" }));
            closeFp();
            setFeedback({ tone: "success", title: "False positive submitted", text: "A reviewer will look at it. The finding stays in this report." });
        } catch (error) {
            setFpStatus((s) => {
                const next = { ...s };
                delete next[key];
                return next;
            });
            setFpError(error instanceof Error ? error.message : "Failed to submit the false positive.");
        }
    }

    return (
        <div className="min-h-dvh bg-nv-graphite-950">
            <main id="nv-main" tabIndex={-1} className="mx-auto w-full max-w-[var(--nv-page-max)] space-y-8 px-[var(--nv-gutter)] py-6 sm:py-10">
                <header className="space-y-5 rounded-3xl border border-nv-graphite-700 bg-nv-graphite-900 p-5 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="nv-eyebrow">Security report{isSharedView ? " · shared view, read only" : ""}</p>
                        <StatusPill status={isOutdated ? "danger" : "warning"}>{isOutdated ? "Outdated" : `Expires in ${countdown}`}</StatusPill>
                    </div>
                    <h1 className="nv-display text-nv-display-md tracking-[-0.045em] text-balance text-nv-ivory-50">
                        <span className="text-nv-ivory-300">{scan.owner} / </span>
                        {scan.repo}
                    </h1>
                    <p className="m-0 text-nv-body text-nv-ivory-200">
                        {scan.depth === "deep" ? "Deep scan" : "Quick scan"} on {fmtDateTime(scan.timestamp)}. Reports are kept for 7 days after a scan.
                    </p>

                    <div data-testid="report-actions" className="space-y-3 print:hidden">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={repoChatHref} className={buttonClasses(isOutdated ? "primary" : "secondary")}>
                                <MessageCircle aria-hidden className="size-4" />
                                {isOutdated ? "Rescan in repo chat" : "Talk to the codebase"}
                            </Link>
                            <Link href={repoProfileHref} className={buttonClasses("secondary")}>
                                Repository profile
                            </Link>
                            {!isOutdated && (
                                <>
                                    <Button leading={<Wrench aria-hidden className="size-4" />} disabled={findingViews.length === 0} onClick={() => setShowFixPrompt(true)}>
                                        Remediate with AI
                                    </Button>
                                    <Button leading={<Copy aria-hidden className="size-4" />} onClick={() => void copyWithFeedback(snippet, "Report summary")}>
                                        Copy summary
                                    </Button>
                                    <Button
                                        leading={<Download aria-hidden className="size-4" />}
                                        onClick={() => {
                                            const r = downloadMarkdownReport(scan);
                                            setFeedback({ tone: r.ok ? "success" : "danger", title: r.message });
                                        }}
                                    >
                                        Download Markdown
                                    </Button>
                                    <Button
                                        leading={<Printer aria-hidden className="size-4" />}
                                        onClick={() => {
                                            const r = openPrintDialog();
                                            if (!r.ok) setFeedback({ tone: "danger", title: r.message });
                                        }}
                                    >
                                        Print or save as PDF
                                    </Button>
                                    <Button leading={<Search aria-hidden className="size-4" />} onClick={() => setShowDeepScan(true)}>
                                        Deep scan another repo
                                    </Button>
                                </>
                            )}
                        </div>
                        {!isOutdated && canShareReport && (
                            <ShareControls scanId={scan.id} canGenerateOutreach={canGenerateOutreach} shareMode={shareMode} reportExpiresAt={reportExpiresAt} />
                        )}
                        {feedback && (
                            <Notice tone={feedback.tone} title={feedback.title}>
                                {feedback.text}
                            </Notice>
                        )}
                    </div>
                </header>

                {isOutdated && (
                    <Notice tone="warning" title="This report is outdated" action={<Link href={repoChatHref} className={buttonClasses("primary")}>Rescan</Link>}>
                        The repository may have changed since {fmtDateTime(scan.timestamp)}. Treat the findings as historical.
                    </Notice>
                )}

                <EvidencePanel scope={scope} />

                <div className="grid gap-8 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                    <aside aria-label="Report summary" className="space-y-6 xl:sticky xl:top-20 xl:self-start">
                        <section aria-labelledby="sev-h" className="space-y-4 rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5">
                            <h2 id="sev-h" className="text-nv-title font-medium text-nv-ivory-50">
                                Severity counts
                            </h2>
                            {segments.length > 0 ? (
                                <StackedBar caption={`${recordedTotal} findings recorded by the scanner`} segments={segments} />
                            ) : (
                                <p className="m-0 text-nv-body text-nv-ivory-200">No findings were recorded for this scan configuration.</p>
                            )}
                            {hiddenCount > 0 && (
                                <p className="m-0 text-nv-small text-nv-ivory-300">
                                    Counts include {hiddenCount} finding{hiddenCount === 1 ? "" : "s"} the verifier did not confirm, so the list shows fewer.
                                </p>
                            )}
                        </section>

                        <section aria-labelledby="diff-h" className="space-y-4 rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5">
                            <h2 id="diff-h" className="text-nv-title font-medium text-nv-ivory-50">
                                Change since the previous scan
                            </h2>
                            {hasPreviousScan ? (
                                <MetricGroup className="md:grid-cols-3">
                                    <Metric label="New" value={priorScanDiff.new} source="vs previous scan" />
                                    <Metric label="Resolved" value={priorScanDiff.resolved} source="vs previous scan" />
                                    <Metric label="Unchanged" value={priorScanDiff.unchanged} source="vs previous scan" />
                                </MetricGroup>
                            ) : (
                                <p className="m-0 text-nv-body text-nv-ivory-200">No earlier scan of this repository exists. This report is the baseline.</p>
                            )}
                        </section>

                        {topFixes.length > 0 && (
                            <section aria-labelledby="first-h" className="space-y-4 rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5">
                                <h2 id="first-h" className="text-nv-title font-medium text-nv-ivory-50">
                                    Fix first
                                </h2>
                                <p className="m-0 text-nv-small text-nv-ivory-300">Ordered by severity, confidence and exploitability tag (inferred).</p>
                                <ol className="m-0 list-decimal space-y-2 pl-5 text-nv-small text-nv-ivory-100 marker:text-nv-copper-400">
                                    {topFixes.slice(0, 3).map((v) => (
                                        <li key={`${v.fingerprint}:${v.index}`}>
                                            {v.finding.title}
                                            <span className="block font-mono text-nv-micro text-nv-ivory-300">
                                                {v.finding.file}
                                                {v.finding.line ? `:${v.finding.line}` : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}
                    </aside>

                    <section aria-labelledby="findings-h" className="min-w-0 space-y-6">
                        <h2 id="findings-h" className="text-nv-title font-medium text-nv-ivory-50">
                            Findings <span className="nv-num text-nv-ivory-300">({shownTotal})</span>
                        </h2>
                        {shownTotal === 0 ? (
                            <EmptyState title="No verified findings">
                                <p>The scanner reported nothing it could verify. That is not proof the code is safe; see the limits above.</p>
                            </EmptyState>
                        ) : (
                            grouped.map((g) => (
                                <div key={g.severity} className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-nv-body font-medium text-nv-ivory-100">
                                        <StatusPill status={severityStatus[g.severity]}>{severityLabel[g.severity]}</StatusPill>
                                        <span className="nv-num text-nv-ivory-300">{g.views.length}</span>
                                    </h3>
                                    <ul className="m-0 list-none space-y-3 p-0">
                                        {g.views.map((view) => {
                                            const key = `${view.fingerprint}:${view.index}`;
                                            return (
                                                <FindingCard
                                                    key={key}
                                                    view={view}
                                                    owner={scan.owner}
                                                    repo={scan.repo}
                                                    falsePositive={fpStatus[key] ?? "idle"}
                                                    onReportFalsePositive={() => {
                                                        setFpKey(key);
                                                        setFpError(null);
                                                    }}
                                                />
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))
                        )}
                    </section>
                </div>

                <p className="no-export m-0 border-t border-nv-graphite-700 pt-6 text-nv-small text-nv-ivory-300">
                    Generated by{" "}
                    <a href={baseUrl} className="text-nv-copper-400 underline underline-offset-2">
                        Novaris
                    </a>
                    .
                </p>
            </main>

            <Dialog
                open={showFixPrompt}
                onClose={() => setShowFixPrompt(false)}
                title="Remediate with AI"
                description="Review the prompt, then copy it into repo chat to work through the findings."
                footer={
                    <>
                        <Button onClick={() => setShowFixPrompt(false)}>Close</Button>
                        <Button
                            variant="primary"
                            leading={<Copy aria-hidden className="size-4" />}
                            onClick={async () => {
                                if (await copyWithFeedback(globalFixPrompt, "Remediation prompt", "report_fix_prompt_copied")) setShowFixPrompt(false);
                            }}
                        >
                            Copy prompt
                        </Button>
                    </>
                }
            >
                <pre className="m-0 max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded-nv-sm bg-nv-graphite-850 p-3 font-mono text-nv-micro text-nv-ivory-200">{globalFixPrompt}</pre>
            </Dialog>

            <Dialog
                open={showDeepScan}
                onClose={() => {
                    setShowDeepScan(false);
                    setDeepScanError(null);
                }}
                title="Deep scan another repository"
                description="Opens repo chat and starts the deep scan prompt for that repository."
                footer={
                    <>
                        <Button onClick={() => setShowDeepScan(false)}>Cancel</Button>
                        <Button variant="primary" disabled={deepScanInput.trim().length === 0} onClick={launchDeepScan}>
                            Launch deep scan
                        </Button>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        launchDeepScan();
                    }}
                >
                    <Input
                        label="Repository"
                        hint="owner/repo or https://github.com/owner/repo"
                        value={deepScanInput}
                        error={deepScanError}
                        onChange={(e) => {
                            setDeepScanInput(e.target.value);
                            setDeepScanError(null);
                        }}
                        autoComplete="off"
                    />
                </form>
            </Dialog>

            <Dialog
                open={Boolean(activeView)}
                onClose={() => !fpPending && closeFp()}
                title="Report a false positive"
                description={activeView ? `${activeView.finding.title} (${activeView.finding.file}${activeView.finding.line ? `:${activeView.finding.line}` : ""})` : undefined}
                footer={
                    <>
                        <Button onClick={closeFp} disabled={fpPending}>
                            Cancel
                        </Button>
                        <Button variant="primary" loading={fpPending} disabled={fpDetails.trim().length === 0} onClick={() => void submitFp()}>
                            Submit
                        </Button>
                    </>
                }
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submitFp();
                    }}
                >
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="fp-reason" className="text-nv-small font-medium text-nv-ivory-200">
                            Why is this a false positive?
                        </label>
                        <select
                            id="fp-reason"
                            value={fpReason}
                            onChange={(e) => setFpReason(e.target.value as ReportFalsePositiveReason)}
                            className="min-h-11 w-full rounded-nv-sm border border-nv-graphite-500 bg-nv-graphite-850 px-3 text-nv-body text-nv-ivory-100"
                        >
                            {falsePositiveReasonOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        <p className="m-0 text-nv-micro text-nv-ivory-300">{falsePositiveReasonOptions.find((o) => o.value === fpReason)?.description}</p>
                    </div>
                    <Textarea
                        label="Details (required)"
                        hint="What controls exist, and what should the reviewer check?"
                        value={fpDetails}
                        maxLength={2000}
                        onChange={(e) => setFpDetails(e.target.value)}
                    />
                    {fpError && (
                        <Notice tone="danger" title="Not submitted">
                            {fpError}
                        </Notice>
                    )}
                </form>
            </Dialog>
        </div>
    );
}
