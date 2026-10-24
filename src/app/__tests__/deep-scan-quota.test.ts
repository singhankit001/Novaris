import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
    auth: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    get: vi.fn(),
    runSecurityScan: vi.fn(),
    getCached: vi.fn(),
    saveScanResult: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/admin-auth", () => ({ isAdminUser: () => false }));
vi.mock("@vercel/kv", () => ({ kv: { incr: m.incr, decr: m.decr, expire: m.expire, get: m.get } }));
vi.mock("@/lib/github", () => ({ getDefaultBranchHeadSha: vi.fn().mockResolvedValue("sha1") }));
vi.mock("@/lib/analytics", () => ({}));
vi.mock("@/lib/cache", () => ({
    getCachedSecurityScanResult: m.getCached,
    cacheSecurityScanResult: vi.fn(),
}));
vi.mock("@/lib/services/query-pipeline", () => ({}));
vi.mock("@/lib/services/security-service", () => ({
    buildScanConfig: (o: { depth?: string }) => ({ analysisProfile: o.depth === "quick" ? "quick" : "deep", maxFiles: 10, aiEnabled: false, engineVersion: "1", cacheKeyVersion: "1" }),
    runSecurityScan: m.runSecurityScan,
}));
vi.mock("@/lib/services/scan-storage", () => ({ saveScanResult: m.saveScanResult, getLatestScanId: vi.fn(), getScanResultWithStatus: vi.fn() }));
vi.mock("@/lib/services/repo-index-service", () => ({}));
vi.mock("@/lib/services/history-service", () => ({}));
vi.mock("@/lib/services/artifact-service", () => ({}));
vi.mock("@/lib/services/scan-share-links", () => ({}));
vi.mock("@/lib/domain", () => ({}));
vi.mock("@/lib/gemini", () => ({}));
vi.mock("@/lib/profile-stream", () => ({}));
vi.mock("@/lib/services/report-service", () => ({}));
vi.mock("@/lib/site-url", () => ({}));
vi.mock("@/lib/services/report-access", () => ({}));
vi.mock("@/lib/services/report-false-positives", () => ({}));
vi.mock("@/lib/services/finding-verification-store", () => ({ saveScanFindingVerificationRecords: vi.fn() }));
vi.mock("@/lib/services/fix-verification", () => ({}));
vi.mock("@/lib/services/repo-suggestions", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { getRemainingDeepScans, scanRepositoryVulnerabilities } from "@/app/actions";

const files = [{ path: "a.ts" }];
const fakeResult = { summary: { total: 0 }, findings: [], hiddenFindings: [], rejectedFindings: [], verificationRecords: [], meta: { depth: "deep" } };

describe("deep scan monthly quota", () => {
    beforeEach(() => {
        Object.values(m).forEach((fn) => fn.mockReset());
        m.auth.mockResolvedValue({ user: { id: "u1" } });
        m.getCached.mockResolvedValue(null);
        m.decr.mockResolvedValue(0);
        m.expire.mockResolvedValue(1);
        m.runSecurityScan.mockResolvedValue(fakeResult);
        m.saveScanResult.mockResolvedValue("scan_1");
    });

    it("reserves with INCR before scanning and refuses over the cap, refunding the slot", async () => {
        m.incr.mockResolvedValue(16);
        await expect(scanRepositoryVulnerabilities("o", "r", files, { depth: "deep" })).rejects.toThrow(/limit reached/);
        expect(m.decr).toHaveBeenCalledTimes(1);
        expect(m.runSecurityScan).not.toHaveBeenCalled();
    });

    it("refunds the reserved slot when the scan throws", async () => {
        m.incr.mockResolvedValue(3);
        m.runSecurityScan.mockRejectedValue(new Error("boom"));
        await expect(scanRepositoryVulnerabilities("o", "r", files, {})).rejects.toThrow("boom");
        expect(m.decr).toHaveBeenCalledTimes(1);
    });

    it("refuses a deep scan when the counter cannot be reached", async () => {
        m.incr.mockRejectedValue(new Error("kv down"));
        await expect(scanRepositoryVulnerabilities("o", "r", files, {})).rejects.toThrow(/temporarily unavailable/);
        expect(m.runSecurityScan).not.toHaveBeenCalled();
    });

    it("does not charge cache hits and reports reportAccess owner for signed-in users", async () => {
        m.getCached.mockResolvedValue(fakeResult);
        const res = await scanRepositoryVulnerabilities("o", "r", files, {});
        expect(m.incr).not.toHaveBeenCalled();
        expect(res.reportAccess).toBe("owner");
    });

    it("marks anonymous scans as unviewable", async () => {
        m.auth.mockResolvedValue(null);
        m.getCached.mockResolvedValue(fakeResult);
        const res = await scanRepositoryVulnerabilities("o", "r", files, { depth: "quick" });
        expect(res.reportAccess).toBe("anonymous-unviewable");
    });

    it("sets expiry once and keeps the charge after a successful scan", async () => {
        m.incr.mockResolvedValue(1);
        const res = await scanRepositoryVulnerabilities("o", "r", files, {});
        expect(m.expire).toHaveBeenCalledTimes(1);
        expect(m.decr).not.toHaveBeenCalled();
        expect(res.scanId).toBe("scan_1");
    });

    it("rejects malformed owner and oversized file lists before any work", async () => {
        await expect(scanRepositoryVulnerabilities("../x", "r", files, {})).rejects.toThrow(/Invalid owner/);
        await expect(
            scanRepositoryVulnerabilities("o", "r", Array.from({ length: 5001 }, (_, i) => ({ path: `f${i}` })), {})
        ).rejects.toThrow(/At most 5000/);
        expect(m.runSecurityScan).not.toHaveBeenCalled();
    });

    it("getRemainingDeepScans fails closed when KV errors", async () => {
        m.get.mockRejectedValue(new Error("kv down"));
        const r = await getRemainingDeepScans();
        expect(r).toMatchObject({ used: 15, total: 15, unavailable: true });
    });
});
