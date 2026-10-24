"use client";

import { OverviewStatsView } from "@/components/Dashboard/OverviewStats";
import { ScansView, type ScanListItem } from "@/components/Dashboard/ScansTable";

// The views take a retry callback, so they must be rendered from a client module.
const noop = () => {};

export function DashboardFixture({ scans }: { scans: ScanListItem[] }) {
  return (
    <div className="mx-auto max-w-[var(--nv-page-max)] space-y-8 px-[var(--nv-gutter)]">
      <OverviewStatsView state={{ status: "ok", data: { stats: { reposScanned: 3, issuesFound: 8, deepScans: 1 } } }} retry={noop} />
      <ScansView state={{ status: "ok", data: { scans } }} retry={noop} showViewAll />
    </div>
  );
}

export function DashboardStatesFixture() {
  return (
    <div className="mx-auto grid max-w-[var(--nv-page-max)] gap-8 px-[var(--nv-gutter)] lg:grid-cols-2">
      <ScansView state={{ status: "ok", data: { scans: [] } }} retry={noop} />
      <ScansView state={{ status: "loading" }} retry={noop} />
      <ScansView state={{ status: "error", message: "Failed to fetch scans", httpStatus: 500 }} retry={noop} />
      <ScansView state={{ status: "unauthorized", message: "Unauthorized" }} retry={noop} />
      <OverviewStatsView state={{ status: "error", message: "Failed to fetch stats", httpStatus: 500 }} retry={noop} />
    </div>
  );
}
