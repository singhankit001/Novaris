import { beforeEach, describe, expect, it, vi } from "vitest";

interface LinkRow {
    id: string;
    scanId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdByUserId: string | null;
    createdAt: Date;
    accessCount: number;
    lastAccessedAt: Date | null;
}

const { rows } = vi.hoisted(() => ({ rows: new Map<string, LinkRow>() }));

vi.mock("@/lib/db", () => {
    let nextId = 1;
    const find = (where: Partial<LinkRow>) =>
        [...rows.values()].find((row) =>
            Object.entries(where).every(([key, value]) => row[key as keyof LinkRow] === value)
        ) ?? null;
    const repoScanShareLink = {
        findUnique: vi.fn(async ({ where }: { where: Partial<LinkRow> }) => find(where)),
        create: vi.fn(async ({ data }: { data: Partial<LinkRow> }) => {
            const row: LinkRow = {
                id: `link_${nextId++}`,
                createdAt: new Date(),
                revokedAt: null,
                createdByUserId: null,
                accessCount: 0,
                lastAccessedAt: null,
                ...data,
            } as LinkRow;
            rows.set(row.id, row);
            return row;
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const row = rows.get(where.id)!;
            for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === "object" && "increment" in value) {
                    (row as unknown as Record<string, number>)[key] += (value as { increment: number }).increment;
                } else {
                    (row as unknown as Record<string, unknown>)[key] = value;
                }
            }
            return row;
        }),
        updateMany: vi.fn(async ({ where, data }: { where: { id: string; revokedAt: null }; data: Partial<LinkRow> }) => {
            const row = rows.get(where.id);
            if (!row || row.revokedAt !== null) return { count: 0 };
            Object.assign(row, data);
            return { count: 1 };
        }),
    };
    const prisma = {
        repoScanShareLink,
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ repoScanShareLink })),
    };
    return { prisma };
});

import {
    createScanShareLink,
    hashShareToken,
    peekScanFromShareToken,
    resolveScanFromShareToken,
    revokeScanShareLink,
} from "@/lib/services/scan-share-links";

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

describe("scan-share-links", () => {
    beforeEach(() => {
        rows.clear();
        process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
    });

    it("stores only the hash of the URL token, and the stored hash cannot open the link", async () => {
        const link = await createScanShareLink({ scanId: "scan_1", createdByUserId: "user_1", canonicalExpiresAt: inDays(7) });
        const row = rows.get(link.linkId)!;

        expect(row.tokenHash).toBe(hashShareToken(link.token));
        expect(row.tokenHash).not.toBe(link.token);
        expect(row.createdByUserId).toBe("user_1");

        expect(await peekScanFromShareToken(link.token)).toMatchObject({ status: "ok", scanId: "scan_1" });
        expect(await peekScanFromShareToken(row.tokenHash)).toEqual({ status: "invalid" });
    });

    it("returns the same URL for repeat shares of an active link", async () => {
        const first = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });
        const second = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });

        expect(second.linkId).toBe(first.linkId);
        expect(second.token).toBe(first.token);
        expect(rows.size).toBe(1);
    });

    it("rotates the token when an expired or revoked link is shared again, killing the old URL", async () => {
        const first = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });
        rows.get(first.linkId)!.expiresAt = new Date(Date.now() - 1_000);

        const refreshed = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });
        expect(refreshed.linkId).toBe(first.linkId);
        expect(refreshed.token).not.toBe(first.token);
        expect(await peekScanFromShareToken(first.token)).toEqual({ status: "invalid" });

        expect(await revokeScanShareLink(refreshed.linkId)).toBe(true);
        expect(await revokeScanShareLink(refreshed.linkId)).toBe(false);
        expect(await peekScanFromShareToken(refreshed.token)).toEqual({ status: "revoked" });

        // Production always passes the scan's fixed expiry, so rotation must not depend on it.
        const reissued = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: rows.get(refreshed.linkId)!.expiresAt });
        expect(reissued.token).not.toBe(refreshed.token);
        expect(await peekScanFromShareToken(refreshed.token)).toEqual({ status: "invalid" });
    });

    it("counts accesses on resolve but not on peek", async () => {
        const link = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });
        await peekScanFromShareToken(link.token);
        await resolveScanFromShareToken(link.token);
        expect(rows.get(link.linkId)!.accessCount).toBe(1);
    });

    it("reports invalid, expired and revoked states", async () => {
        expect(await resolveScanFromShareToken("short")).toEqual({ status: "invalid" });
        expect(await resolveScanFromShareToken("abcdefghijklmnopqrstuvwx_0123456789ABCD")).toEqual({ status: "invalid" });

        const link = await createScanShareLink({ scanId: "scan_1", canonicalExpiresAt: inDays(7) });
        rows.get(link.linkId)!.expiresAt = new Date(Date.now() - 1_000);
        expect(await resolveScanFromShareToken(link.token)).toEqual({ status: "expired" });
    });

    it("keeps legacy links, whose URL token is the stored value, working until they expire", async () => {
        const legacyToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        rows.set("legacy", {
            id: "legacy",
            scanId: "scan_legacy",
            tokenHash: legacyToken,
            expiresAt: inDays(3),
            revokedAt: null,
            createdByUserId: null,
            createdAt: new Date(),
            accessCount: 0,
            lastAccessedAt: null,
        });

        expect(await peekScanFromShareToken(legacyToken)).toMatchObject({ status: "ok", scanId: "scan_legacy" });
        const reshared = await createScanShareLink({ scanId: "scan_legacy", canonicalExpiresAt: inDays(3) });
        expect(reshared.token).toBe(legacyToken);
    });

    it("refuses to issue links without AUTH_SECRET", async () => {
        delete process.env.AUTH_SECRET;
        delete process.env.NEXTAUTH_SECRET;
        await expect(createScanShareLink({ scanId: "scan_2", canonicalExpiresAt: inDays(7) })).rejects.toThrow("AUTH_SECRET");
    });
});
