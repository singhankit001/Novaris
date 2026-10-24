"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/nv/button";
import { getCanonicalSiteUrl } from "@/lib/site-url";

interface CopyBadgeProps {
    owner: string;
    repo: string;
}

export function CopyBadge({ owner, repo }: CopyBadgeProps) {
    const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
    const baseUrl = getCanonicalSiteUrl();
    const snippet = `[![Analyzed by Novaris](https://img.shields.io/badge/Analyzed%20by-Novaris-8E5636?style=for-the-badge)](${baseUrl}/repo/${owner}/${repo})`;
    const clipboardAvailable = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setState("copied");
        } catch {
            setState("failed");
        }
        setTimeout(() => setState("idle"), 2500);
    };

    return (
        <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-nv-body font-medium text-nv-ivory-50">README badge</h3>
                    <p className="text-nv-small text-nv-ivory-300">Markdown that links back to this repository page.</p>
                </div>
                <Button
                    onClick={copy}
                    disabled={!clipboardAvailable}
                    leading={state === "copied" ? <Check aria-hidden className="size-4 text-nv-success" /> : <Copy aria-hidden className="size-4" />}
                >
                    {state === "copied" ? "Copied" : "Copy Markdown"}
                </Button>
            </div>
            <pre className="m-0 overflow-x-auto rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-850 p-3 font-nv-mono text-nv-micro text-nv-ivory-200 whitespace-pre-wrap break-all select-all">{snippet}</pre>
            <p role="status" aria-live="polite" className={state === "failed" ? "text-nv-small text-nv-danger" : "sr-only"}>
                {state === "failed" ? "Copy failed. Select the text above and copy it by hand." : state === "copied" ? "Badge Markdown copied." : ""}
            </p>
            {!clipboardAvailable && <p className="text-nv-small text-nv-ivory-300">Clipboard access is not available here. Select the text and copy it by hand.</p>}
        </div>
    );
}
