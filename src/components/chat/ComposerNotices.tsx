"use client";

import { Notice } from "@/components/nv/notice";
import { Button } from "@/components/nv/button";
import type { ActionStatus } from "./use-analysis-chat";
import type { AnalysisState } from "./analysis-machine";
import type { ToolQuotaState } from "./use-tool-quota";

interface ComposerNoticesProps {
    machine: AnalysisState;
    quota: ToolQuotaState | null;
    resetLabel: string;
    scopeLabel: string;
    actionStatus: ActionStatus;
    overTokenLimit: boolean;
    onSignIn: () => void;
    onClear: () => void;
    onShowQuota: () => void;
}

/** Everything the composer needs to explain, rendered above the input so nothing hides in a placeholder. */
export function ComposerNotices({ machine, quota, resetLabel, scopeLabel, actionStatus, overTokenLimit, onSignIn, onClear, onShowQuota }: ComposerNoticesProps) {
    const exhausted = Boolean(quota && !quota.unavailable && quota.remaining === 0);
    return (
        <div className="flex flex-col gap-2 empty:hidden">
            {machine.phase === "rate-limited" && machine.kind === "request" && (
                <Notice tone="warning" title="You are sending requests too fast">
                    {machine.retryAfterSeconds ? `Wait about ${machine.retryAfterSeconds} seconds, then send again.` : machine.message}
                </Notice>
            )}
            {machine.phase === "rate-limited" && machine.kind === "github" && (
                <Notice tone="warning" title="GitHub rate limit reached" action={<Button onClick={onSignIn}>Sign in</Button>}>
                    {machine.message}
                </Notice>
            )}
            {machine.phase === "unauthorized" && (
                <Notice tone="info" title={machine.reason === "thinking" ? "Thinking mode needs a signed-in account" : machine.reason === "cross-repo" ? "Cross-repo analysis needs a signed-in account" : "Sign in to continue"} action={<Button variant="primary" onClick={onSignIn}>Sign in with GitHub</Button>}>
                    {machine.message}
                </Notice>
            )}
            {quota?.unavailable && (
                <Notice tone="info" title="Live GitHub lookups are unavailable right now">
                    The {scopeLabel} tool budget could not be read. You can still ask questions; answers use the data already loaded.
                </Notice>
            )}
            {exhausted && quota && (
                <Notice tone="warning" title="Tool calls paused for this window" action={<Button onClick={onShowQuota}>Details</Button>}>
                    Live lookups resume in <span className="nv-num">{resetLabel}</span>. Until then answers use the data already loaded.
                </Notice>
            )}
            {overTokenLimit && (
                <Notice tone="warning" title="This conversation is at its length limit" action={<Button onClick={onClear}>Clear chat</Button>}>
                    Clear the chat to start a new conversation.
                </Notice>
            )}
            {actionStatus && (
                <p role="status" aria-live="polite" className={actionStatus.tone === "error" ? "text-nv-small text-nv-danger" : "text-nv-small text-nv-success"}>
                    {actionStatus.text}
                </p>
            )}
        </div>
    );
}
