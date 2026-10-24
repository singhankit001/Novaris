"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/nv/button";
import { MetricStrip } from "@/components/nv/data";
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
            <LoadingRegion label="Loading your totals" className="grid grid-cols-1 border-y border-nv-graphite-700 sm:grid-cols-3 sm:divide-x sm:divide-nv-graphite-700">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-4 px-6 py-8">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-12 w-20" />
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
    const note = "From saved scans that have not expired";
    return (
        <MetricStrip
            label="Account totals"
            items={[
                { label: "Repositories scanned", value: reposScanned, note },
                { label: "Findings in saved reports", value: issuesFound, note },
                { label: "Deep scans", value: deepScans, note },
            ]}
        />
    );
}
