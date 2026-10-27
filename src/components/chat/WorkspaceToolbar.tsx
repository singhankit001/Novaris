"use client";

import type { ReactNode } from "react";
import { Download, MessageSquareText, Trash2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./chat.module.css";

/** Hover and focus tip below the control. Anchored to an edge so it never widens the page. */
function Tooltip({ text, children, align = "center" }: { text: string; children: ReactNode; align?: "center" | "end" }) {
    return (
        <span className="group/tip relative inline-flex">
            {children}
            <span
                role="tooltip"
                aria-hidden
                className={cn(
                    "pointer-events-none absolute top-full z-40 mt-2 w-max max-w-60 rounded-nv-sm bg-nv-ivory-100 px-2.5 py-1.5 text-nv-micro leading-snug text-white opacity-0 shadow-nv-popover transition-opacity duration-150",
                    "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 [@media(hover:none)]:hidden",
                    align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
            >
                {text}
            </span>
        </span>
    );
}

export interface SegmentAction {
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    hint?: string;
}

interface MeterProps {
    icon: ReactNode;
    label: string;
    text: ReactNode;
    /** 0..1 */
    fill: number;
    tone: "ok" | "warn" | "danger";
    onClick?: () => void;
    title: string;
}

const toneBar = { ok: "bg-nv-copper-400", warn: "bg-nv-warning", danger: "bg-nv-danger" } as const;
const toneText = { ok: "text-nv-ivory-200", warn: "text-nv-warning", danger: "text-nv-danger" } as const;

/** Small usage readout with a hairline bar. Text carries the value; colour is a second channel. */
function Meter({ icon, label, text, fill, tone, onClick, title }: MeterProps) {
    const body = (
        <>
            <span aria-hidden className="text-nv-ivory-300">{icon}</span>
            <span className="sr-only">{label}: </span>
            <span className={cn("nv-num text-nv-micro font-medium", toneText[tone])}>{text}</span>
            <span aria-hidden className="relative hidden h-[3px] w-9 sm:block overflow-hidden rounded-full bg-nv-graphite-700">
                <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300", toneBar[tone])} style={{ width: `${Math.max(4, Math.min(100, fill * 100))}%` }} />
            </span>
        </>
    );
    const cls = "inline-flex min-h-9 items-center gap-2 rounded-full border border-nv-graphite-700 bg-white px-3 shadow-nv-xs";
    return onClick ? (
        <Tooltip text={title} align="end">
            <button type="button" onClick={onClick} className={cn(cls, "touch-manipulation transition-colors hover:border-nv-graphite-500 [@media(pointer:coarse)]:min-h-11")} aria-label={`${label}: ${title}`}>{body}</button>
        </Tooltip>
    ) : (
        <Tooltip text={title} align="end">
            <span className={cls} role="group" aria-label={label}>{body}</span>
        </Tooltip>
    );
}

export interface ToolbarMeters {
    tokens: { used: string; max: string; fill: number; level: "safe" | "warning" | "danger" };
    quota?: { remaining: number; limit: number; exhausted: boolean; onClick: () => void };
}

interface WorkspaceToolbarProps {
    segments?: SegmentAction[];
    meters: ToolbarMeters;
    onExport: () => void;
    onClear: () => void;
    /** Extra controls placed before export, e.g. search. */
    extra?: ReactNode;
    /** Left-side lead, e.g. the profile identity. */
    lead?: ReactNode;
}

function IconAction({ label, tip, icon, onClick, danger }: { label: string; tip: string; icon: ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <Tooltip text={tip} align="end">
            <button
                type="button"
                onClick={onClick}
                aria-label={tip}
                className={cn(
                    "inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-nv-sm px-2.5 text-nv-small font-medium text-nv-ivory-200 transition-colors [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center",
                    danger ? "hover:bg-nv-danger-wash hover:text-nv-danger" : "hover:bg-nv-graphite-850 hover:text-nv-ivory-50",
                )}
            >
                <span aria-hidden>{icon}</span>
                <span className="hidden lg:inline">{label}</span>
            </button>
        </Tooltip>
    );
}

/** Conversation controls: quick analyses on the left, usage meters and export/clear on the right. */
export function WorkspaceToolbar({ segments = [], meters, onExport, onClear, extra, lead }: WorkspaceToolbarProps) {
    const tokenTone = meters.tokens.level === "danger" ? "danger" : meters.tokens.level === "warning" ? "warn" : "ok";
    const quota = meters.quota;
    return (
        <div role="toolbar" aria-label="Conversation controls" className={`${s.glass} relative z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-nv-graphite-700 px-3 py-2 sm:px-5`}>
            {lead}
            {segments.length > 0 && (
                <div role="group" aria-label="Quick analyses" className="inline-flex rounded-full border border-nv-graphite-700 bg-nv-graphite-850 p-0.5 shadow-[inset_0_1px_2px_rgb(21_23_29/0.05)]">
                    {segments.map((seg) => (
                        <Tooltip key={seg.id} text={seg.hint ?? seg.label}>
                            <button
                                type="button"
                                onClick={seg.onClick}
                                disabled={seg.disabled}
                                className="inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-full px-3.5 text-nv-small font-medium text-nv-ivory-200 transition-[background-color,color,box-shadow] hover:bg-white hover:text-nv-ivory-50 hover:shadow-nv-xs disabled:cursor-not-allowed disabled:opacity-45 [@media(pointer:coarse)]:min-h-11"
                            >
                                <span aria-hidden className="text-nv-copper-400">{seg.icon}</span>
                                {seg.label}
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <span className="hidden sm:contents"><Meter
                    icon={<MessageSquareText className="size-3.5" />}
                    label="Conversation length"
                    text={<>{meters.tokens.used} <span className="font-normal text-nv-ivory-300">/ {meters.tokens.max}</span></>}
                    fill={meters.tokens.fill}
                    tone={tokenTone}
                    title="Conversation length in tokens"
                /></span>
                {quota && (
                    <Meter
                        icon={<Wrench className="size-3.5" />}
                        label="Tool calls left"
                        text={<>{quota.remaining} <span className="font-normal text-nv-ivory-300">/ {quota.limit}</span></>}
                        fill={quota.limit > 0 ? quota.remaining / quota.limit : 0}
                        tone={quota.exhausted ? "warn" : "ok"}
                        onClick={quota.onClick}
                        title="Tool calls left in this window. Click for details"
                    />
                )}
                <span aria-hidden className="mx-1 hidden h-5 w-px bg-nv-graphite-700 sm:block" />
                {extra}
                <IconAction label="Export" tip="Export this conversation as Markdown" icon={<Download className="size-4" />} onClick={onExport} />
                <IconAction label="Clear" tip="Clear this conversation" icon={<Trash2 className="size-4" />} onClick={onClear} danger />
            </div>
        </div>
    );
}
