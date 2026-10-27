"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session-guard";
import { canAccessPrivateReport } from "@/lib/services/report-access";
import { getScanResultWithStatus } from "@/lib/services/scan-storage";
import { revokeScanShareLink } from "@/lib/services/scan-share-links";

export type RevokeShareResult =
    | { ok: true; revoked: true }
    | { ok: true; revoked: false; reason: "no_active_link" }
    | { ok: false; error: string };

/**
 * Revokes the public share link of a scan. Owner or admin only (same check as the private report page).
 * A scan has at most one share link, so the scan id identifies it.
 */
export async function revokeReportShareLink(scanId: string): Promise<RevokeShareResult> {
    if (typeof scanId !== "string" || scanId.length === 0 || scanId.length > 128) {
        return { ok: false, error: "Invalid report id." };
    }
    const session = await auth();
    if (!getSessionUserId(session)) {
        return { ok: false, error: "Sign in to manage share links." };
    }

    const scanResult = await getScanResultWithStatus(scanId);
    // Same answer for a missing scan and a forbidden one so ids cannot be probed.
    if (scanResult.status === "not_found" || !canAccessPrivateReport(session, scanResult.scan)) {
        return { ok: false, error: "Report not found." };
    }

    const link = await prisma.repoScanShareLink.findUnique({
        where: { scanId },
        select: { id: true, revokedAt: true, expiresAt: true },
    });
    if (!link || link.revokedAt || link.expiresAt.getTime() <= Date.now()) {
        return { ok: true, revoked: false, reason: "no_active_link" };
    }

    const revoked = await revokeScanShareLink(link.id);
    return revoked ? { ok: true, revoked: true } : { ok: true, revoked: false, reason: "no_active_link" };
}
