"use client";

import { useEffect, useState } from "react";

export type ToolQuotaScope = "repo" | "profile";
export type ToolQuotaAudience = "anonymous" | "authenticated";

export interface ToolQuotaState {
    scope: ToolQuotaScope;
    audience: ToolQuotaAudience;
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    windowSecondsRemaining: number;
    exhausted: boolean;
    /** The budget store could not be read: the numbers are not real. */
    unavailable?: boolean;
}

export function formatDuration(seconds: number): string {
    const n = Math.max(0, Math.floor(seconds));
    return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60].map((v) => v.toString().padStart(2, "0")).join(":");
}

export async function fetchToolQuota(scope: ToolQuotaScope): Promise<ToolQuotaState | null> {
    try {
        const response = await fetch(`/api/chat/quota?scope=${scope}`);
        return response.ok ? ((await response.json()) as ToolQuotaState) : null;
    } catch {
        return null;
    }
}

/** Tool-call budget for the current window, plus a once-a-second countdown to its reset. */
export function useToolQuota(scope: ToolQuotaScope, userId: string | undefined) {
    const [quota, setQuota] = useState<ToolQuotaState | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let cancelled = false;
        void fetchToolQuota(scope).then((q) => {
            if (!cancelled && q) setQuota(q);
        });
        return () => {
            cancelled = true;
        };
    }, [scope, userId]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const resetMs = quota && Number.isFinite(Date.parse(quota.resetAt)) ? Date.parse(quota.resetAt) : 0;
    const secondsRemaining = quota ? (resetMs ? Math.max(0, Math.ceil((resetMs - now) / 1000)) : Math.max(0, quota.windowSecondsRemaining)) : 0;

    return {
        quota,
        setQuota,
        resetLabel: formatDuration(secondsRemaining),
        unavailable: Boolean(quota?.unavailable),
        exhausted: Boolean(quota && !quota.unavailable && quota.remaining === 0),
        refresh: async () => {
            const q = await fetchToolQuota(scope);
            if (q) setQuota(q);
            return q;
        },
    };
}
