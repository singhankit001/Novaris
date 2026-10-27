import { createHash, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

export const DEFAULT_SCAN_SHARE_TTL_DAYS = 7;
const MIN_TOKEN_LENGTH = 24;

export type ScanShareResolution =
    | { status: "ok"; linkId: string; scanId: string; expiresAt: Date }
    | { status: "invalid" | "expired" | "revoked" };

function normalizeTtlDays(ttlDays?: number): number {
    const value = typeof ttlDays === "number" ? Math.floor(ttlDays) : DEFAULT_SCAN_SHARE_TTL_DAYS;
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_SCAN_SHARE_TTL_DAYS;
    return Math.min(value, 90);
}

function getShareTokenSecret(): string {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required to issue report share links.");
    }
    return secret;
}

/**
 * The bearer token is an HMAC of the link id and its issue time (createdAt), so it can be
 * re-derived for repeat shares without being stored; the database only holds its SHA-256.
 * Refreshing an expired or revoked link resets createdAt, which rotates the token and kills
 * the old URL.
 */
function deriveShareToken(linkId: string, issuedAt: Date): string {
    return createHmac("sha256", getShareTokenSecret())
        .update(`report-share:${linkId}:${issuedAt.getTime()}`)
        .digest("base64url");
}

function isDerivedTokenHash(link: { id: string; tokenHash: string; createdAt: Date }): boolean {
    return hashShareToken(deriveShareToken(link.id, link.createdAt)) === link.tokenHash;
}

export function hashShareToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function isPlausibleToken(token: string): boolean {
    return /^[A-Za-z0-9_-]+$/.test(token) && token.length >= MIN_TOKEN_LENGTH;
}

export async function createScanShareLink(params: {
    scanId: string;
    createdByUserId?: string | null;
    canonicalExpiresAt?: Date;
    ttlDays?: number;
}): Promise<{ linkId: string; token: string; expiresAt: Date; createdAt: Date }> {
    const existing = await prisma.repoScanShareLink.findUnique({
        where: { scanId: params.scanId },
        select: {
            id: true,
            tokenHash: true,
            expiresAt: true,
            createdAt: true,
            revokedAt: true,
        },
    });
    const ttlDays = normalizeTtlDays(params.ttlDays);
    const canonicalExpiresAt = params.canonicalExpiresAt
        ? new Date(params.canonicalExpiresAt)
        : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    if (existing && existing.expiresAt.getTime() > Date.now() && !existing.revokedAt) {
        // Links issued before the HMAC scheme used their stored hash as the URL token; keep handing
        // that URL out until the link expires so links already shared keep working.
        const token = isDerivedTokenHash(existing)
            ? deriveShareToken(existing.id, existing.createdAt)
            : existing.tokenHash;
        return { linkId: existing.id, token, expiresAt: existing.expiresAt, createdAt: existing.createdAt };
    }

    if (existing) {
        // Strictly later than the previous issue time, so the token always rotates.
        const issuedAt = new Date(Math.max(Date.now(), existing.createdAt.getTime() + 1));
        const token = deriveShareToken(existing.id, issuedAt);
        const refreshed = await prisma.repoScanShareLink.update({
            where: { id: existing.id },
            data: {
                expiresAt: canonicalExpiresAt,
                revokedAt: null,
                createdAt: issuedAt,
                tokenHash: hashShareToken(token),
            },
            select: { id: true, createdAt: true, expiresAt: true },
        });
        return { linkId: refreshed.id, token, expiresAt: refreshed.expiresAt, createdAt: refreshed.createdAt };
    }

    // The id is needed to derive the token, so create with a placeholder hash and set it in one transaction.
    return prisma.$transaction(async (tx) => {
        const link = await tx.repoScanShareLink.create({
            data: {
                scanId: params.scanId,
                tokenHash: `pending:${createHash("sha256").update(`${params.scanId}:${Date.now()}:${Math.random()}`).digest("hex")}`,
                expiresAt: canonicalExpiresAt,
                createdByUserId: params.createdByUserId ?? null,
            },
            select: { id: true, createdAt: true, expiresAt: true },
        });
        const token = deriveShareToken(link.id, link.createdAt);
        await tx.repoScanShareLink.update({
            where: { id: link.id },
            data: { tokenHash: hashShareToken(token) },
        });
        return { linkId: link.id, token, expiresAt: link.expiresAt, createdAt: link.createdAt };
    });
}

async function resolveScanFromShareTokenInternal(token: string, recordAccess: boolean): Promise<ScanShareResolution> {
    if (!isPlausibleToken(token)) {
        return { status: "invalid" };
    }

    const select = { id: true, scanId: true, expiresAt: true, revokedAt: true, tokenHash: true, createdAt: true } as const;
    let link = await prisma.repoScanShareLink.findUnique({
        where: { tokenHash: hashShareToken(token) },
        select,
    });
    if (!link) {
        // Legacy links: the URL token is the stored value itself. Accept it only for rows that were
        // not issued under the HMAC scheme, so a database read cannot open current links.
        const legacy = await prisma.repoScanShareLink.findUnique({ where: { tokenHash: token }, select });
        link = legacy && !isDerivedTokenHash(legacy) ? legacy : null;
    }

    if (!link) {
        return { status: "invalid" };
    }
    if (link.revokedAt) {
        return { status: "revoked" };
    }
    if (link.expiresAt.getTime() <= Date.now()) {
        return { status: "expired" };
    }

    if (recordAccess) {
        await prisma.repoScanShareLink.update({
            where: { id: link.id },
            data: {
                accessCount: { increment: 1 },
                lastAccessedAt: new Date(),
            },
        });
    }

    return {
        status: "ok",
        linkId: link.id,
        scanId: link.scanId,
        expiresAt: link.expiresAt,
    };
}

export async function resolveScanFromShareToken(token: string): Promise<ScanShareResolution> {
    return resolveScanFromShareTokenInternal(token, true);
}

export async function peekScanFromShareToken(token: string): Promise<ScanShareResolution> {
    return resolveScanFromShareTokenInternal(token, false);
}

export async function getScanShareLinkById(linkId: string) {
    return prisma.repoScanShareLink.findUnique({
        where: { id: linkId },
        select: {
            id: true,
            scanId: true,
            createdByUserId: true,
            revokedAt: true,
            expiresAt: true,
        },
    });
}

export async function revokeScanShareLink(linkId: string): Promise<boolean> {
    const result = await prisma.repoScanShareLink.updateMany({
        where: {
            id: linkId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
    return result.count > 0;
}
