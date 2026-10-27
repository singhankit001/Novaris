"use client";

import { AlertCircle, AlertOctagon, AlertTriangle, Info, ListFilter, type LucideIcon } from "lucide-react";
import { SEVERITIES, severityLabel, type Severity } from "@/app/report/[scan_id]/finding-meta";

const icons: Record<Severity, LucideIcon> = {
    critical: AlertOctagon,
    high: AlertTriangle,
    medium: AlertCircle,
    low: Info,
    info: Info,
};

export type SeverityChoice = Severity | "all";

/** Filter chips for the findings list. Counts come from the findings actually shown. */
export function SeverityFilter({
    counts,
    value,
    onChange,
    groupBy,
    onGroupByChange,
}: {
    counts: Record<Severity, number>;
    value: SeverityChoice;
    onChange: (next: SeverityChoice) => void;
    groupBy: "severity" | "file";
    onGroupByChange: (next: "severity" | "file") => void;
}) {
    const total = SEVERITIES.reduce((n, s) => n + counts[s], 0);
    const chip = (active: boolean) =>
        `inline-flex min-h-11 items-center gap-1.5 rounded-nv-sm border px-3 text-nv-small transition-colors duration-150 ${
            active ? "border-nv-copper-400 bg-nv-graphite-850 text-nv-ivory-50" : "border-nv-graphite-700 text-nv-ivory-200 hover:bg-nv-graphite-850"
        }`;
    return (
        <div role="group" aria-label="Filter findings by severity" className="flex flex-wrap gap-2 print:hidden">
            <button type="button" aria-pressed={value === "all"} onClick={() => onChange("all")} className={chip(value === "all")}>
                <ListFilter aria-hidden className="size-4" />
                All <span className="nv-num text-nv-ivory-300">{total}</span>
            </button>
            {SEVERITIES.filter((s) => counts[s] > 0).map((s) => {
                const Icon = icons[s];
                return (
                    <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)} className={chip(value === s)}>
                        <Icon aria-hidden className="size-4" />
                        {severityLabel[s]} <span className="nv-num text-nv-ivory-300">{counts[s]}</span>
                    </button>
                );
            })}
            <span className="ml-auto inline-flex items-center gap-2 text-nv-small text-nv-ivory-300">
                Group by
                {(["severity", "file"] as const).map((g) => (
                    <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => onGroupByChange(g)} className={chip(groupBy === g)}>
                        {g === "severity" ? "Severity" : "File"}
                    </button>
                ))}
            </span>
        </div>
    );
}
