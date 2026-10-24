"use client";

import { useState } from "react";
import { Copy, Link2Off, Megaphone, Share2 } from "lucide-react";
import { createScanShareLink, generateOutreachPack } from "@/app/actions";
import { revokeReportShareLink } from "@/app/report/share-actions";
import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";
import { Notice, type NoticeTone } from "@/components/nv/notice";

interface ShareControlsProps {
    scanId: string;
    canGenerateOutreach: boolean;
    shareMode: "canonical" | "copy-current-url";
    reportExpiresAt: number;
}

interface Feedback {
    tone: NoticeTone;
    title: string;
    text?: string;
}

async function copy(value: string): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}

const fmt = (iso: string | number) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function ShareControls({ scanId, canGenerateOutreach, shareMode, reportExpiresAt }: ShareControlsProps) {
    const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
    const [outreach, setOutreach] = useState<string | null>(null);
    const [busy, setBusy] = useState<"share" | "outreach" | "revoke" | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const canRevoke = shareMode === "canonical";

    async function copyWithFeedback(value: string, what: string, expiresAt: string) {
        const ok = await copy(value);
        setFeedback(
            ok
                ? { tone: "success", title: `${what} copied`, text: `The link stops working on ${fmt(expiresAt)}.` }
                : { tone: "warning", title: "Clipboard is blocked", text: `Select the ${what.toLowerCase()} below and copy it manually.` },
        );
    }

    async function share() {
        setFeedback(null);
        if (shareMode === "copy-current-url") {
            const next = { url: window.location.href, expiresAt: new Date(reportExpiresAt).toISOString() };
            setLink(next);
            await copyWithFeedback(next.url, "Report link", next.expiresAt);
            return;
        }
        setBusy("share");
        try {
            const created = await createScanShareLink(scanId);
            setLink({ url: created.url, expiresAt: created.expiresAt });
            await copyWithFeedback(created.url, "Report link", created.expiresAt);
        } catch (error) {
            setFeedback({ tone: "danger", title: "Could not create a share link", text: error instanceof Error ? error.message : undefined });
        } finally {
            setBusy(null);
        }
    }

    async function buildOutreach() {
        setFeedback(null);
        setBusy("outreach");
        try {
            const pack = await generateOutreachPack(scanId);
            setOutreach(pack.outreachMessage);
            setLink({ url: pack.shareUrl, expiresAt: pack.expiresAt });
            await copyWithFeedback(pack.outreachMessage, "Outreach message", pack.expiresAt);
        } catch (error) {
            setFeedback({ tone: "danger", title: "Could not build the outreach pack", text: error instanceof Error ? error.message : undefined });
        } finally {
            setBusy(null);
        }
    }

    async function revoke() {
        setBusy("revoke");
        try {
            const result = await revokeReportShareLink(scanId);
            setConfirmRevoke(false);
            if (!result.ok) {
                setFeedback({ tone: "danger", title: "Could not revoke the link", text: result.error });
            } else if (result.revoked) {
                setLink(null);
                setFeedback({ tone: "success", title: "Share link revoked", text: "Anyone opening the old link now sees a revoked-link page. Share again to issue a new one." });
            } else {
                setFeedback({ tone: "info", title: "No active share link", text: "There is nothing to revoke: no link was shared, or it already expired or was revoked." });
            }
        } catch {
            setConfirmRevoke(false);
            setFeedback({ tone: "danger", title: "Could not revoke the link", text: "The request failed. Try again." });
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" leading={<Share2 aria-hidden className="size-4" />} loading={busy === "share"} onClick={share}>
                    {shareMode === "canonical" ? "Share report" : "Copy link"}
                </Button>
                {link && shareMode === "canonical" && (
                    <Button leading={<Copy aria-hidden className="size-4" />} onClick={() => copyWithFeedback(link.url, "Report link", link.expiresAt)}>
                        Copy link again
                    </Button>
                )}
                {canGenerateOutreach && (
                    <Button leading={<Megaphone aria-hidden className="size-4" />} loading={busy === "outreach"} onClick={buildOutreach}>
                        Outreach pack
                    </Button>
                )}
                {outreach && (
                    <Button leading={<Copy aria-hidden className="size-4" />} onClick={() => copyWithFeedback(outreach, "Outreach message", link?.expiresAt ?? new Date(reportExpiresAt).toISOString())}>
                        Copy outreach
                    </Button>
                )}
                {canRevoke && (
                    <Button variant="danger" leading={<Link2Off aria-hidden className="size-4" />} onClick={() => setConfirmRevoke(true)}>
                        Revoke share link
                    </Button>
                )}
            </div>
            {link && (
                <p className="m-0 break-all rounded-nv-sm bg-nv-graphite-850 px-3 py-2 font-mono text-nv-micro text-nv-ivory-200">
                    <span className="sr-only">Share link: </span>
                    {link.url}
                    <span className="block text-nv-ivory-300">Expires {fmt(link.expiresAt)}</span>
                </p>
            )}
            {feedback && (
                <Notice tone={feedback.tone} title={feedback.title}>
                    {feedback.text}
                </Notice>
            )}
            <Dialog
                open={confirmRevoke}
                onClose={() => busy !== "revoke" && setConfirmRevoke(false)}
                title="Revoke the share link?"
                description="People who already have the link will lose access immediately. This does not delete the report."
                destructive
                footer={
                    <>
                        <Button onClick={() => setConfirmRevoke(false)} disabled={busy === "revoke"}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={busy === "revoke"} onClick={revoke}>
                            Revoke link
                        </Button>
                    </>
                }
            />
        </div>
    );
}
