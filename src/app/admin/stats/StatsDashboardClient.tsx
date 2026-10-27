"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AnalyticsData, LoggedInUserData, VisitorData } from "@/lib/analytics";
import { deleteLoggedInUserAccount, resetAdminReportFunnel, updateReportFalsePositiveReviewStatus } from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import PageHeader from "@/components/Dashboard/PageHeader";
import { Badge, StatusPill } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { BarList, Sparkline } from "@/components/nv/charts";
import { DataTable, Metric, MetricGroup, type Column } from "@/components/nv/data";
import { Notice, type NoticeTone } from "@/components/nv/notice";
import { Tabs } from "@/components/nv/tabs";

type HistoryRange = "24h" | "1w" | "1m" | "3m";
type SelectionRange = "24h" | "7d";
type FpStatus = "PENDING" | "CONFIRMED_FALSE_POSITIVE" | "REJECTED";
type VisitorSortKey = "lastSeen" | "queryCount" | "country" | "device" | "id";

interface StatsDashboardClientProps {
    data: AnalyticsData;
    userAgent: string;
    country: string;
    isMobile: boolean;
    currentUsername: string | null;
}

interface Feedback {
    tone: NoticeTone;
    title: string;
    text?: string;
}

const RANGE_MS: Record<HistoryRange, number> = {
    "24h": 24 * 3_600_000,
    "1w": 7 * 24 * 3_600_000,
    "1m": 30 * 24 * 3_600_000,
    "3m": 90 * 24 * 3_600_000,
};

const selectClass = "min-h-11 rounded-nv-sm border border-nv-graphite-500/70 bg-nv-graphite-850 px-3 text-nv-body text-nv-ivory-100 shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)] focus:border-nv-copper-400 focus:bg-white disabled:opacity-45";

function formatReason(reason: string): string {
    return reason
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

const formatIST = (timestamp: number) =>
    new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium", hour12: true }).format(new Date(timestamp));

function Select<T extends string>({ id, label, value, options, onChange }: { id: string; label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-nv-small font-medium text-nv-ivory-200">
                {label}
            </label>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={selectClass}>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function StatsDashboardClient({ data, userAgent, country, isMobile, currentUsername }: StatsDashboardClientProps) {
    const router = useRouter();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(data);
    const [falsePositiveRows, setFalsePositiveRows] = useState(() => data.falsePositiveReview?.recentSubmissions ?? []);
    const [accountRows, setAccountRows] = useState<LoggedInUserData[]>(() => data.loggedInUsers ?? []);
    const [visitorRows, setVisitorRows] = useState<VisitorData[]>(() => data.recentVisitors ?? []);
    const [nextVisitorCursor, setNextVisitorCursor] = useState<string | null>(data.nextVisitorCursor ?? null);
    const [nextLoggedInCursor, setNextLoggedInCursor] = useState<string | null>(data.nextLoggedInCursor ?? null);
    const [loadingMore, setLoadingMore] = useState<"visitors" | "accounts" | null>(null);
    const [selectedRange, setSelectedRange] = useState<HistoryRange>("24h");
    const [selectionRange, setSelectionRange] = useState<SelectionRange>("24h");
    const [sortKey, setSortKey] = useState<VisitorSortKey>("lastSeen");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [currentTime, setCurrentTime] = useState(0);
    const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isResettingFunnel, setIsResettingFunnel] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<LoggedInUserData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    useEffect(() => {
        const tick = () => setCurrentTime(Date.now());
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, []);

    // Reset derived state during render when upstream props change (no effect needed).
    const [prevData, setPrevData] = useState(data);
    if (prevData !== data) {
        setPrevData(data);
        setAnalyticsData(data);
        setVisitorRows(data.recentVisitors ?? []);
        setAccountRows(data.loggedInUsers ?? []);
        setFalsePositiveRows(data.falsePositiveReview?.recentSubmissions ?? []);
        setNextVisitorCursor(data.nextVisitorCursor ?? null);
        setNextLoggedInCursor(data.nextLoggedInCursor ?? null);
    }

    const failure = (title: string, error: unknown, fallback: string) =>
        setFeedback({ tone: "danger", title, text: error instanceof Error ? error.message : fallback });

    const relative = (timestamp: number) => {
        const diff = currentTime - timestamp;
        if (diff < 60_000) return "just now";
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
    };
    const isOnline = (lastSeen: number) => currentTime - lastSeen < 5 * 60_000;

    function refresh() {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    }

    async function changeFalsePositiveStatus(submissionId: string, status: FpStatus) {
        setPendingSubmissionId(submissionId);
        setFeedback(null);
        try {
            const updated = await updateReportFalsePositiveReviewStatus({ submissionId, status });
            setFalsePositiveRows((rows) => rows.map((row) => (row.id === submissionId ? updated : row)));
            setFeedback({ tone: "success", title: "False positive status updated" });
            router.refresh();
        } catch (error) {
            failure("Could not update the status", error, "Failed to update false positive status");
        } finally {
            setPendingSubmissionId(null);
        }
    }

    async function resetFunnel() {
        setIsResettingFunnel(true);
        setFeedback(null);
        try {
            await resetAdminReportFunnel();
            setFeedback({ tone: "success", title: "Report funnel counters reset" });
            setIsResetDialogOpen(false);
            router.refresh();
        } catch (error) {
            setIsResetDialogOpen(false);
            failure("Could not reset the funnel", error, "Failed to reset report funnel");
        } finally {
            setIsResettingFunnel(false);
        }
    }

    async function deleteAccount() {
        if (!deleteCandidate) return;
        const target = deleteCandidate;
        setDeletingUserId(target.id);
        setFeedback(null);
        try {
            await deleteLoggedInUserAccount({ userId: target.id });
            setAccountRows((rows) => rows.filter((u) => u.id !== target.id));
            setFeedback({ tone: "success", title: "Incomplete account deleted" });
            router.refresh();
        } catch (error) {
            failure("Could not delete the account", error, "Failed to delete account");
        } finally {
            setDeletingUserId(null);
            setDeleteCandidate(null);
        }
    }

    async function loadMore(kind: "visitors" | "accounts") {
        const cursor = kind === "visitors" ? nextVisitorCursor : nextLoggedInCursor;
        if (!cursor || loadingMore) return;
        setLoadingMore(kind);
        setFeedback(null);
        const query =
            kind === "visitors"
                ? `visitorLimit=10&visitorCursor=${encodeURIComponent(cursor)}&loggedInLimit=10`
                : `visitorLimit=10&loggedInLimit=10&loggedInCursor=${encodeURIComponent(cursor)}`;
        try {
            const response = await fetch(`/api/admin/stats/details?${query}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`The details request returned HTTP ${response.status}.`);
            const details = (await response.json()) as Partial<AnalyticsData>;
            if (kind === "visitors") {
                setVisitorRows((rows) => [...rows, ...(details.recentVisitors ?? [])]);
                setNextVisitorCursor(details.nextVisitorCursor ?? null);
            } else {
                setAccountRows((rows) => [...rows, ...(details.loggedInUsers ?? [])]);
                setNextLoggedInCursor(details.nextLoggedInCursor ?? null);
            }
            setAnalyticsData((current) => ({
                ...current,
                activeUsers24h: details.activeUsers24h ?? current.activeUsers24h,
                returningUsers30d: details.returningUsers30d ?? current.returningUsers30d,
                retentionRate30d: details.retentionRate30d ?? current.retentionRate30d,
            }));
        } catch (error) {
            failure(kind === "visitors" ? "Could not load more visitors" : "Could not load more accounts", error, "The request failed.");
        } finally {
            setLoadingMore(null);
        }
    }

    const returningUsers = analyticsData.returningUsers30d ?? 0;
    const retentionRate = (analyticsData.retentionRate30d ?? 0).toFixed(1);
    const avgQueries = analyticsData.totalVisitors > 0 ? (analyticsData.totalQueries / analyticsData.totalVisitors).toFixed(1) : "0";
    const funnel = analyticsData.reportFunnel;
    const fpSummary = analyticsData.falsePositiveReview;
    const selection = analyticsData.searchPerformance?.byWindow?.[selectionRange] ?? { avgSelectionMs: 0, indexHitRate: 0, fallbackRate: 0, selections: 0 };
    const incompleteCount = accountRows.filter((u) => !u.email).length;

    const sortedVisitors = [...visitorRows].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
    });

    const history = analyticsData.kvStats?.history ?? [];
    const latestPoint = history[history.length - 1]?.timestamp ?? 0;
    const horizon = (currentTime > 0 ? currentTime : latestPoint) - RANGE_MS[selectedRange];
    const rangedHistory = history.filter((h) => h.timestamp >= horizon);
    const sparkValues = rangedHistory.length > 60 ? rangedHistory.filter((_, i) => i % Math.ceil(rangedHistory.length / 60) === 0) : rangedHistory;
    const kvMax = analyticsData.kvStats?.maxSize || 0;
    const kvNow = analyticsData.kvStats?.currentSize || 0;

    const deviceItems = Object.entries(analyticsData.deviceStats)
        .filter(([, count]) => count > 0)
        .map(([device, count]) => ({ label: device, value: count, display: `${count} (${Math.round((count / Math.max(analyticsData.totalVisitors, 1)) * 100)}%)`, tone: "copper" as const }));
    const countryItems = Object.entries(analyticsData.countryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, count]) => ({ label: name, value: count, tone: "patina" as const }));

    const overview = (
        <div className="space-y-10">
            <section aria-labelledby="kpi-h" className="space-y-4">
                <h2 id="kpi-h" className="text-nv-title font-medium text-nv-ivory-50">
                    Usage
                </h2>
                <MetricGroup className="md:grid-cols-5">
                    <Metric label="Visitors" value={analyticsData.totalVisitors} source={`${returningUsers} returning, analytics store`} />
                    <Metric label="Queries" value={analyticsData.totalQueries} source={`${avgQueries} per visitor`} />
                    <Metric label="Retention, 30 days" value={`${retentionRate}%`} unit="" source="2+ active days over all active users" />
                    <Metric label="Logged-in accounts" value={analyticsData.totalLoggedInUsers} source={`${accountRows.length} loaded, Postgres`} />
                    <Metric label="KV storage" value={formatSize(kvNow)} source={`${((kvNow / (kvMax || 1)) * 100).toFixed(2)}% of ${formatSize(kvMax)}`} />
                </MetricGroup>
                <p className="m-0 text-nv-small text-nv-ivory-300">
                    Active in the last 24 hours: <span className="nv-num text-nv-ivory-100">{analyticsData.activeUsers24h}</span>. Totals come from the analytics store and carry no trend comparison.
                </p>
            </section>

            <section aria-labelledby="split-h" className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                    <h2 id="split-h" className="text-nv-title font-medium text-nv-ivory-50">
                        Devices and countries
                    </h2>
                    {deviceItems.length > 0 ? <BarList caption="Visitors by device" items={deviceItems} /> : <p className="m-0 text-nv-ivory-300">No device data recorded.</p>}
                </div>
                <div className="md:pt-10">{countryItems.length > 0 ? <BarList caption="Top countries by visitors" items={countryItems} /> : <p className="m-0 text-nv-ivory-300">No country data recorded.</p>}</div>
            </section>

            <section aria-labelledby="search-h" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 id="search-h" className="text-nv-title font-medium text-nv-ivory-50">
                        File selection performance
                    </h2>
                    <Select id="sel-range" label="Window" value={selectionRange} onChange={setSelectionRange} options={[{ value: "24h", label: "Last 24 hours" }, { value: "7d", label: "Last 7 days" }]} />
                </div>
                <MetricGroup>
                    <Metric label="Average selection" value={selection.avgSelectionMs} unit="ms" source="selection timings" />
                    <Metric label="Index hit rate" value={`${selection.indexHitRate.toFixed(1)}%`} source="selection timings" />
                    <Metric label="Fallback rate" value={`${selection.fallbackRate.toFixed(1)}%`} source="selection timings" />
                    <Metric label="Selections" value={selection.selections} source="selection timings" />
                </MetricGroup>
            </section>

            <section aria-labelledby="funnel-h" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="funnel-h" className="text-nv-title font-medium text-nv-ivory-50">
                        Report to chat funnel, 7 days
                    </h2>
                    <Button variant="danger" leading={<RefreshCw aria-hidden className="size-4" />} loading={isResettingFunnel} onClick={() => setIsResetDialogOpen(true)}>
                        Reset funnel
                    </Button>
                </div>
                <MetricGroup>
                    <Metric label="Shared views" value={funnel?.weekly.report_viewed_shared ?? 0} source="funnel counters" />
                    <Metric label="Login gates shown" value={funnel?.weekly.report_fix_login_gate_shown ?? 0} source="funnel counters" />
                    <Metric label="Fix chats started" value={funnel?.weekly.report_fix_chat_started ?? 0} source="funnel counters" />
                    <Metric label="Conversion" value={`${(funnel?.weeklyConversionRate ?? 0).toFixed(1)}%`} source="chats / shared views" />
                </MetricGroup>
            </section>

            <section aria-labelledby="kv-h" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 id="kv-h" className="text-nv-title font-medium text-nv-ivory-50">
                        KV storage history
                    </h2>
                    <Select
                        id="kv-range"
                        label="Range"
                        value={selectedRange}
                        onChange={setSelectedRange}
                        options={[{ value: "24h", label: "Last 24 hours" }, { value: "1w", label: "Last week" }, { value: "1m", label: "Last month" }, { value: "3m", label: "Last 3 months" }]}
                    />
                </div>
                {sparkValues.length < 2 ? (
                    <p className="m-0 text-nv-ivory-300">Not enough storage samples in this range to draw a trend yet.</p>
                ) : (
                    <>
                        <Sparkline
                            values={sparkValues.map((p) => p.size)}
                            label="KV storage size"
                            summary={`${sparkValues.length} samples from ${formatSize(sparkValues[0]?.size ?? 0)} to ${formatSize(sparkValues[sparkValues.length - 1]?.size ?? 0)}`}
                            width={640}
                            height={96}
                            className="max-w-2xl [&>svg]:max-w-none"
                        />
                        <p className="m-0 text-nv-small text-nv-ivory-300">
                            {sparkValues.length} samples, {new Date(sparkValues[0]?.timestamp ?? 0).toLocaleString()} to {new Date(sparkValues[sparkValues.length - 1]?.timestamp ?? 0).toLocaleString()}. Limit {formatSize(kvMax)}.
                        </p>
                    </>
                )}
            </section>

            <section aria-labelledby="sess-h" className="space-y-2">
                <h2 id="sess-h" className="text-nv-title font-medium text-nv-ivory-50">
                    Your current session
                </h2>
                <dl className="m-0 grid gap-4 text-nv-small sm:grid-cols-3">
                    <div>
                        <dt className="nv-eyebrow">Country</dt>
                        <dd className="m-0 text-nv-ivory-100">{country || "Unknown"}</dd>
                    </div>
                    <div>
                        <dt className="nv-eyebrow">Device</dt>
                        <dd className="m-0 text-nv-ivory-100">{isMobile ? "Mobile" : "Desktop"}</dd>
                    </div>
                    <div className="min-w-0">
                        <dt className="nv-eyebrow">User agent</dt>
                        <dd className="m-0 break-all font-nv-mono text-nv-micro text-nv-ivory-200">{userAgent || "Not sent"}</dd>
                    </div>
                </dl>
            </section>
        </div>
    );

    const fpColumns: Column<(typeof falsePositiveRows)[number]>[] = [
        {
            key: "repo",
            header: "Repository",
            render: (s) => (
                <span className="flex flex-col">
                    <span>
                        {s.owner}/{s.repo}
                    </span>
                    <span className="nv-eyebrow">{s.isSharedView ? "Shared report" : "Private report"}</span>
                </span>
            ),
        },
        {
            key: "finding",
            header: "Finding",
            render: (s) => (
                <span className="flex flex-col">
                    <span>{s.title}</span>
                    <span className="font-nv-mono text-nv-micro text-nv-ivory-300">
                        {s.severity} · {s.file}
                        {s.line ? `:${s.line}` : ""}
                    </span>
                </span>
            ),
        },
        {
            key: "notes",
            header: "Reporter notes",
            render: (s) => (
                <span className="flex max-w-md flex-col gap-1.5">
                    <Badge status="warning">{formatReason(s.reason)}</Badge>
                    <span className="whitespace-pre-wrap text-nv-small text-nv-ivory-200">{s.details}</span>
                </span>
            ),
        },
        { key: "by", header: "Submitted by", render: (s) => (s.submittedByGithubLogin ? `@${s.submittedByGithubLogin}` : "Anonymous") },
        { key: "at", header: "Created", render: (s) => `${formatIST(s.createdAt)} (${relative(s.createdAt)})` },
        {
            key: "status",
            header: "Review status",
            render: (s) => (
                <select
                    aria-label={`Review status for ${s.title}`}
                    value={s.status}
                    disabled={pendingSubmissionId === s.id}
                    onChange={(e) => void changeFalsePositiveStatus(s.id, e.target.value as FpStatus)}
                    className={`${selectClass} min-w-52`}
                >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED_FALSE_POSITIVE">Confirmed false positive</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            ),
        },
    ];

    const falsePositives = (
        <div className="space-y-4">
            <MetricGroup>
                <Metric label="Total" value={fpSummary?.total ?? 0} source="review queue" />
                <Metric label="Pending" value={fpSummary?.pending ?? 0} source="review queue" />
                <Metric label="Confirmed" value={fpSummary?.confirmedFalsePositive ?? 0} source="review queue" />
                <Metric label="Rejected" value={fpSummary?.rejected ?? 0} source="review queue" />
            </MetricGroup>
            <DataTable caption="Recent false positive submissions" columns={fpColumns} rows={falsePositiveRows} rowKey={(s) => s.id} empty="No false positive submissions yet." />
        </div>
    );

    const accountColumns: Column<LoggedInUserData>[] = [
        {
            key: "account",
            header: "Account",
            render: (u) => (
                <span className="flex flex-col">
                    <span className="flex items-center gap-2">
                        {u.githubLogin ? `@${u.githubLogin}` : u.id.slice(0, 10)}
                        {!u.email && <StatusPill status="danger">Incomplete</StatusPill>}
                    </span>
                    <span className="nv-eyebrow">Joined {formatIST(u.createdAt)}</span>
                </span>
            ),
        },
        { key: "email", header: "Email", render: (u) => u.email || "Missing email" },
        { key: "q", header: "Queries", numeric: true, render: (u) => u.queryCount },
        { key: "scans", header: "Scans", numeric: true, render: (u) => u.scanCount },
        { key: "search", header: "Searches", numeric: true, render: (u) => u.searchCount },
        { key: "chat", header: "Chats", numeric: true, render: (u) => u.chatCount },
        { key: "last", header: "Last activity (IST)", render: (u) => (u.lastActivityAt ? `${formatIST(u.lastActivityAt)} (${relative(u.lastActivityAt)})` : "No activity") },
        {
            key: "actions",
            header: "Actions",
            render: (u) =>
                !u.email && u.githubLogin !== currentUsername ? (
                    <Button variant="danger" leading={<Trash2 aria-hidden className="size-4" />} loading={deletingUserId === u.id} onClick={() => setDeleteCandidate(u)}>
                        Delete
                    </Button>
                ) : (
                    <span className="text-nv-small text-nv-ivory-300">{u.githubLogin === currentUsername ? "Protected" : "Retained"}</span>
                ),
        },
    ];

    const accounts = (
        <div className="space-y-4">
            <p className="m-0 text-nv-small text-nv-ivory-300">
                Showing <span className="nv-num">{accountRows.length}</span> of <span className="nv-num">{analyticsData.totalLoggedInUsers}</span>. <span className="nv-num">{incompleteCount}</span> loaded accounts have no email and can be deleted.
            </p>
            <DataTable caption="Logged-in accounts" columns={accountColumns} rows={accountRows} rowKey={(u) => u.id} empty="No logged-in account activity yet." />
            {nextLoggedInCursor && (
                <Button loading={loadingMore === "accounts"} onClick={() => void loadMore("accounts")}>
                    Show 10 more accounts
                </Button>
            )}
        </div>
    );

    const visitorColumns: Column<VisitorData>[] = [
        { key: "id", header: "Actor", render: (v) => <span className="font-nv-mono text-nv-small">{v.actorType === "authenticated" && v.githubLogin ? `@${v.githubLogin}` : v.id.slice(0, 16)}</span> },
        { key: "type", header: "Type", render: (v) => <Badge status={v.actorType === "authenticated" ? "info" : "neutral"}>{v.actorType}</Badge> },
        { key: "country", header: "Country", render: (v) => v.country },
        { key: "device", header: "Device", render: (v) => <span className="capitalize">{v.device}</span> },
        { key: "q", header: "Queries", numeric: true, render: (v) => v.queryCount || 0 },
        { key: "seen", header: "Last seen (IST)", render: (v) => `${formatIST(v.lastSeen)} (${relative(v.lastSeen)})` },
        { key: "online", header: "Status", render: (v) => <StatusPill status={isOnline(v.lastSeen) ? "success" : "neutral"}>{isOnline(v.lastSeen) ? "Online" : "Offline"}</StatusPill> },
    ];

    const visitors = (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <Select
                    id="v-sort"
                    label="Sort by"
                    value={sortKey}
                    onChange={setSortKey}
                    options={[{ value: "lastSeen", label: "Last seen" }, { value: "queryCount", label: "Queries" }, { value: "country", label: "Country" }, { value: "device", label: "Device" }, { value: "id", label: "Actor ID" }]}
                />
                <Button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} aria-label={`Sort direction: ${sortDir === "asc" ? "ascending" : "descending"}. Activate to reverse.`}>
                    {sortDir === "asc" ? "Ascending" : "Descending"}
                </Button>
                <p className="m-0 text-nv-small text-nv-ivory-300">
                    Showing <span className="nv-num">{sortedVisitors.length}</span>
                    {nextVisitorCursor ? ", more available" : ""}. Sorting applies to loaded rows.
                </p>
            </div>
            <DataTable caption="Recent visitors, anonymous and signed in" columns={visitorColumns} rows={sortedVisitors} rowKey={(v) => v.id} empty="No visitors recorded in the current dataset." />
            {nextVisitorCursor && (
                <Button loading={loadingMore === "visitors"} onClick={() => void loadMore("visitors")}>
                    Show 10 more visitors
                </Button>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Admin"
                title="Analytics"
                description="Values read from the analytics store and Postgres. Times are in IST."
                actions={
                    <Button leading={<RefreshCw aria-hidden className="size-4" />} loading={isRefreshing} onClick={refresh}>
                        Refresh
                    </Button>
                }
            />
            {feedback && (
                <Notice tone={feedback.tone} title={feedback.title}>
                    {feedback.text}
                </Notice>
            )}
            <Tabs
                label="Analytics sections"
                items={[
                    { id: "overview", label: "Overview", panel: overview },
                    { id: "fp", label: "False positives", count: falsePositiveRows.length, panel: falsePositives },
                    { id: "accounts", label: "Accounts", count: analyticsData.totalLoggedInUsers, panel: accounts },
                    { id: "visitors", label: "Visitors", count: visitorRows.length, panel: visitors },
                ]}
            />

            <ConfirmDialog
                isOpen={isResetDialogOpen}
                title="Reset report funnel metrics?"
                message="This clears the report funnel counters in KV so the 7-day figures start fresh. Historical values cannot be restored."
                confirmText="Reset funnel"
                cancelText="Cancel"
                confirmVariant="danger"
                onCancel={() => !isResettingFunnel && setIsResetDialogOpen(false)}
                onConfirm={() => !isResettingFunnel && void resetFunnel()}
            />
            <ConfirmDialog
                isOpen={Boolean(deleteCandidate)}
                title="Delete incomplete account?"
                message={
                    deleteCandidate
                        ? `Delete ${deleteCandidate.githubLogin ? `@${deleteCandidate.githubLogin}` : deleteCandidate.id.slice(0, 10)}. This permanently removes the incomplete account and any cascaded child rows.`
                        : ""
                }
                confirmText="Delete account"
                cancelText="Cancel"
                confirmVariant="danger"
                onCancel={() => !deletingUserId && setDeleteCandidate(null)}
                onConfirm={() => !deletingUserId && void deleteAccount()}
            />
        </div>
    );
}
