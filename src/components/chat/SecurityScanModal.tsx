"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";
import { Dialog } from "@/components/nv/dialog";
import { Notice } from "@/components/nv/notice";
import { DEEP_SCAN_FILE_LIMIT, QUICK_SCAN_FILE_LIMIT } from "@/lib/chat-constants";

interface DeepScansData {
    used: number;
    total: number;
    resetsAt: string;
    isUnlimited: boolean;
    unavailable?: boolean;
}

interface SecurityScanModalProps {
    isOpen: boolean;
    isAuthenticated: boolean;
    deepScansData: DeepScansData | null;
    latestScanId?: string | null;
    onClose: () => void;
    onRunQuickScan: (scanAiAssist: boolean) => void;
    onRunDeepScan: (scanAiAssist: boolean) => void;
}

function remainingLabel(data: DeepScansData | null): string {
    if (!data) return "Checking your monthly allowance";
    if (data.unavailable) return "Monthly allowance could not be checked right now";
    if (data.isUnlimited) return "Unlimited (admin)";
    const left = Math.max(0, data.total - data.used);
    const resets = Number.isFinite(Date.parse(data.resetsAt)) ? `, resets ${new Date(data.resetsAt).toLocaleDateString()}` : "";
    return `${left} of ${data.total} left this month${resets}`;
}

export function SecurityScanModal({ isOpen, isAuthenticated, deepScansData, latestScanId, onClose, onRunQuickScan, onRunDeepScan }: SecurityScanModalProps) {
    const aiAssist = true;
    const exhausted = Boolean(deepScansData && !deepScansData.unavailable && !deepScansData.isUnlimited && deepScansData.total - deepScansData.used <= 0);
    const deepDisabled = !isAuthenticated || exhausted;

    return (
        <Dialog open={isOpen} onClose={onClose} title="Security scan" description="Choose how much of the repository to check. Findings link to files and lines.">
            <div className="flex flex-col gap-3">
                <section className="rounded-nv-md border border-nv-graphite-600 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-nv-body font-medium">Quick scan</h3>
                        <span className="font-mono text-nv-micro text-nv-ivory-300">about 30 seconds</span>
                    </div>
                    <p className="mt-1 text-nv-small text-nv-ivory-200">Checks up to {QUICK_SCAN_FILE_LIMIT} files for secrets and common injection points. Open to everyone.</p>
                    <Button className="mt-3" variant="primary" onClick={() => onRunQuickScan(aiAssist)}>Run quick scan</Button>
                </section>

                <section className="rounded-nv-md border border-nv-graphite-600 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-nv-body font-medium">Deep scan</h3>
                        <span className="font-mono text-nv-micro text-nv-ivory-300">about 2 minutes</span>
                    </div>
                    <p className="mt-1 text-nv-small text-nv-ivory-200">Checks up to {DEEP_SCAN_FILE_LIMIT} files with broader deterministic rules plus model review.</p>
                    {isAuthenticated ? (
                        <p className="nv-num mt-2 text-nv-small text-nv-ivory-100">{remainingLabel(deepScansData)}</p>
                    ) : (
                        <Notice className="mt-3" tone="info" title="Deep scans need a signed-in account" action={<Button onClick={() => signIn("github")}>Sign in</Button>}>
                            Reports from deep scans are saved to your account.
                        </Notice>
                    )}
                    {exhausted && <Notice className="mt-3" tone="warning" title="Monthly deep scan limit reached">The allowance resets on the date above.</Notice>}
                    <Button className="mt-3" variant="primary" disabled={deepDisabled} onClick={() => onRunDeepScan(aiAssist)}>Run deep scan</Button>
                </section>

                <section aria-disabled="true" className="rounded-nv-md border border-dashed border-nv-graphite-600 p-4 opacity-75">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-nv-body font-medium">Full Repo Scan</h3>
                        <span className="font-mono text-nv-micro text-nv-ivory-300">Coming soon · 3/month</span>
                    </div>
                    <p className="mt-1 text-nv-small text-nv-ivory-200">Recommended for repositories with more than 500 files. Not available yet.</p>
                </section>

                <p className="text-nv-small text-nv-ivory-300">Scans always run with model review on; it cannot be turned off.</p>

                {latestScanId && (
                    <a className={buttonClasses("secondary")} href={`/report/${latestScanId}`} target="_blank" rel="noopener noreferrer">
                        Open the latest report
                    </a>
                )}
            </div>
        </Dialog>
    );
}
