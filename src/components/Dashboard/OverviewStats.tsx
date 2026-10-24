"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/nv/button";
import { Metric, MetricGroup } from "@/components/nv/data";
import { Notice } from "@/components/nv/notice";
import { LoadingRegion, Skeleton } from "@/components/nv/skeleton";
import { useApi, type ApiState } from "./use-api";

interface Stats {
    reposScanned: number;
    issuesFound: number;
    deepScans: number;
}

export default function OverviewStats() {
    const { state, retry } = useApi<{ stats?: Stats }>("/api/dashboard/stats");
    return <OverviewStatsView state={state} retry={retry} />;
}

export function OverviewStatsView({ state, retry }: { state: ApiState<{ stats?: Stats }>; retry: () => void }) {

    if (state.status === "loading") {
        return (
            <LoadingRegion label="Loading your totals" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2 rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-9 w-16" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </LoadingRegion>
        );
    }
    if (state.status !== "ok" || !state.data.stats) {
        const message = state.status === "ok" ? "The response had no totals." : state.message;
        return (
            <Notice
                tone="danger"
                title="Could not load your totals"
                action={
                    <Button leading={<RefreshCw aria-hidden className="size-4" />} onClick={retry}>
                        Try again
                    </Button>
                }
            >
                {message}
            </Notice>
        );
    }

    const { reposScanned, issuesFound, deepScans } = state.data.stats;
    const source = "your saved scans that have not expired";
    return (
        <MetricGroup className="grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-3">
            <Metric className="rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5 sm:p-6" label="Repositories scanned" value={reposScanned} source={source} />
            <Metric className="rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5 sm:p-6" label="Findings in saved reports" value={issuesFound} source={source} />
            <Metric className="rounded-2xl border border-nv-graphite-700 bg-nv-graphite-900 p-5 sm:p-6" label="Deep scans" value={deepScans} source={source} />
        </MetricGroup>
    );
}
