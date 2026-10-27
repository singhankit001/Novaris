"use client";

import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";

interface ToolQuotaModalProps {
    isOpen: boolean;
    onClose: () => void;
    scope: "repo" | "profile";
    audience: "anonymous" | "authenticated";
    used: number;
    limit: number;
    remaining: number;
    resetCountdown: string;
    supportEmail: string;
}

export function ToolQuotaModal({ isOpen, onClose, scope, audience, used, limit, remaining, resetCountdown, supportEmail }: ToolQuotaModalProps) {
    const scopeLabel = scope === "repo" ? "Repository chat tools" : "Profile chat tools";
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title={remaining === 0 ? "Tool calls paused" : "Tool call budget"}
            description={`${scopeLabel}: ${remaining} of ${limit} calls left in this window.`}
            footer={<Button variant="primary" onClick={onClose}>Continue</Button>}
        >
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-nv-body">
                <dt className="text-nv-ivory-300">Remaining</dt>
                <dd className="nv-num m-0">{remaining} / {limit}</dd>
                <dt className="text-nv-ivory-300">Used</dt>
                <dd className="nv-num m-0">{used} / {limit}</dd>
                <dt className="text-nv-ivory-300">Window resets in</dt>
                <dd className="nv-num m-0">{resetCountdown}</dd>
            </dl>
            <p className="mt-4 text-nv-small text-nv-ivory-200">
                {audience === "anonymous"
                    ? "Signing in raises the limit to 30 tool calls per day."
                    : "While tools are paused you can keep asking; answers use the files already loaded."}
            </p>
            <p className="mt-2 text-nv-small text-nv-ivory-300">Need a higher limit? Write to {supportEmail}.</p>
        </Dialog>
    );
}
