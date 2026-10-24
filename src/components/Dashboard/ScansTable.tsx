"use client";

import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";
import { StatusPill, type Status } from "@/components/nv/badge";
import { DataRow, DataTable, type Column } from "@/components/nv/data";
import { EmptyState, ErrorState, UnauthorizedState } from "@/components/nv/states";
import { LoadingRegion, Skeleton } from "@/components/nv/skeleton";
import { useApi, type ApiState } from "./use-api";

export interface ScanListItem {
    id: string;
    owner: string;
    repo: string;
    timestamp: number;
    depth: string;
    summary: { critical?: number; high: number; medium: number; low: number; total: number };
}

const SEVERITIES: { key: "critical" | "high" | "medium" | "low"; label: string; status: Status }[] = [
    { key: "critical", label: "Critical", status: "danger" },
    { key: "high", label: "High", status: "danger" },
    { key: "medium", label: "Medium", status: "warning" },
    { key: "low", label: "Low", status: "info" },
];

export function SeverityPills({ summary }: { summary: ScanListItem["summary"] }) {
    const present = SEVERITIES.filter((s) => (summary[s.key] ?? 0) > 0);
    if (present.length === 0) {
        return summary.total > 0 ? (
            <StatusPill status="neutral">{summary.total} info</StatusPill>
        ) : (
            <StatusPill status="success">No findings</StatusPill>
        );
    }
    return (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {present.map((s) => (
                <li key={s.key}>
                    <StatusPill status={s.status}>
                        <span className="nv-num">{summary[s.key]}</span> {s.label}
                    </StatusPill>
                </li>
            ))}
        </ul>
    );
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const columns: Column<ScanListItem>[] = [
    {
        key: "repo",
        header: "Repository",
        render: (s) => (
            <Link href={`/report/${s.id}`} className="font-nv-mono text-nv-small font-medium text-nv-copper-400 underline-offset-4 hover:text-nv-copper-300 hover:underline">
                {s.owner}/{s.repo}
            </Link>
        ),
    },
    { key: "depth", header: "Depth", render: (s) => (s.depth === "deep" ? "Deep" : "Quick") },
    { key: "date", header: "Scanned", render: (s) => formatDate(s.timestamp) },
    { key: "findings", header: "Findings", render: (s) => <SeverityPills summary={s.summary} /> },
];

function ScansSkeleton() {
    return (
        <LoadingRegion label="Loading your scans" className="nv-card divide-y divide-nv-graphite-700">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 max-w-full" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                </div>
            ))}
        </LoadingRegion>
    );
}

export default function ScansTable({ limit, showViewAll = false }: { limit?: number; showViewAll?: boolean }) {
    const { state, retry } = useApi<{ scans?: ScanListItem[] }>(`/api/dashboard/scans${limit ? `?limit=${limit}` : ""}`);
    return <ScansView state={state} retry={retry} showViewAll={showViewAll} />;
}

export function ScansView({ state, retry, showViewAll = false }: { state: ApiState<{ scans?: ScanListItem[] }>; retry: () => void; showViewAll?: boolean }) {

    if (state.status === "loading") return <ScansSkeleton />;
    if (state.status === "unauthorized") {
        return <UnauthorizedState reason="Your session ended. Sign in again to see your saved scans." />;
    }
    if (state.status === "error") {
        return (
            <ErrorState
                title="Could not load your scans"
                detail={state.httpStatus ? `HTTP ${state.httpStatus}` : undefined}
                action={
                    <Button variant="primary" leading={<RefreshCw aria-hidden className="size-4" />} onClick={retry}>
                        Try again
                    </Button>
                }
            >
                <p>{state.message}</p>
            </ErrorState>
        );
    }

    const scans = Array.isArray(state.data.scans) ? state.data.scans : [];
    if (scans.length === 0) {
        return (
            <EmptyState
                title="No saved scans yet"
                action={
                    <Link href="/" className={buttonClasses("primary")}>
                        Scan a repository
                    </Link>
                }
            >
                <p>Security scans you run while signed in are saved here for 7 days.</p>
            </EmptyState>
        );
    }

    return (
        <div className="space-y-3">
            <div className="hidden md:block">
                <DataTable caption="Saved security scans" columns={columns} rows={scans} rowKey={(s) => s.id} />
            </div>
            <ul className="nv-card m-0 list-none overflow-hidden p-0 md:hidden">
                {scans.map((s) => (
                    <li key={s.id}>
                        <DataRow
                            href={`/report/${s.id}`}
                            title={`${s.owner}/${s.repo}`}
                            meta={
                                <span className="flex flex-wrap items-center gap-x-2">
                                    {formatDate(s.timestamp)} · {s.depth === "deep" ? "Deep" : "Quick"}
                                </span>
                            }
                            trailing={<ArrowUpRight aria-hidden className="size-4" />}
                        />
                        <div className="border-b border-nv-graphite-700 px-3 pb-3 pt-1 last:border-0">
                            <SeverityPills summary={s.summary} />
                        </div>
                    </li>
                ))}
            </ul>
            {showViewAll && (
                <Link href="/dashboard/scans" className="inline-flex min-h-11 items-center gap-1 text-nv-small font-medium text-nv-copper-400 hover:text-nv-copper-300">
                    View all scans
                </Link>
            )}
        </div>
    );
}
