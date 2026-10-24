import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getScanMock, findLinkMock, revokeMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    getScanMock: vi.fn(),
    findLinkMock: vi.fn(),
    revokeMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ prisma: { repoScanShareLink: { findUnique: findLinkMock } } }));
vi.mock("@/lib/services/scan-storage", () => ({ getScanResultWithStatus: getScanMock }));
vi.mock("@/lib/services/scan-share-links", () => ({ revokeScanShareLink: revokeMock }));

import { revokeReportShareLink } from "@/app/report/share-actions";

const scan = { id: "scan_1", owner: "acme", repo: "widget", userId: "owner_1", expiresAt: Date.now() + 60_000 };
const activeLink = { id: "link_1", revokedAt: null, expiresAt: new Date(Date.now() + 60_000) };

describe("revokeReportShareLink", () => {
    beforeEach(() => {
        for (const mock of [authMock, getScanMock, findLinkMock, revokeMock]) mock.mockReset();
        getScanMock.mockResolvedValue({ status: "ok", scan });
        findLinkMock.mockResolvedValue(activeLink);
        revokeMock.mockResolvedValue(true);
    });

    it("rejects signed-out callers without reading the scan", async () => {
        authMock.mockResolvedValue(null);
        const result = await revokeReportShareLink("scan_1");
        expect(result.ok).toBe(false);
        expect(getScanMock).not.toHaveBeenCalled();
        expect(revokeMock).not.toHaveBeenCalled();
    });

    it("rejects a signed-in user who does not own the scan, with the not-found message", async () => {
        authMock.mockResolvedValue({ user: { id: "intruder" } });
        const result = await revokeReportShareLink("scan_1");
        expect(result).toEqual({ ok: false, error: "Report not found." });
        expect(revokeMock).not.toHaveBeenCalled();
    });

    it("answers a missing scan the same way as a forbidden one", async () => {
        authMock.mockResolvedValue({ user: { id: "owner_1" } });
        getScanMock.mockResolvedValue({ status: "not_found" });
        expect(await revokeReportShareLink("nope")).toEqual({ ok: false, error: "Report not found." });
    });

    it("lets the owner revoke the active link", async () => {
        authMock.mockResolvedValue({ user: { id: "owner_1" } });
        expect(await revokeReportShareLink("scan_1")).toEqual({ ok: true, revoked: true });
        expect(findLinkMock).toHaveBeenCalledWith(expect.objectContaining({ where: { scanId: "scan_1" } }));
        expect(revokeMock).toHaveBeenCalledWith("link_1");
    });

    it("lets the configured admin revoke someone else's link", async () => {
        vi.stubEnv("ADMIN_GITHUB_USERNAME", "admin");
        authMock.mockResolvedValue({ user: { id: "admin_1", username: "admin" } });
        expect(await revokeReportShareLink("scan_1")).toEqual({ ok: true, revoked: true });
        vi.unstubAllEnvs();
    });

    it("reports no active link when none exists, is already revoked, or expired", async () => {
        authMock.mockResolvedValue({ user: { id: "owner_1" } });
        const none = { ok: true, revoked: false, reason: "no_active_link" };
        findLinkMock.mockResolvedValueOnce(null);
        expect(await revokeReportShareLink("scan_1")).toEqual(none);
        findLinkMock.mockResolvedValueOnce({ ...activeLink, revokedAt: new Date() });
        expect(await revokeReportShareLink("scan_1")).toEqual(none);
        findLinkMock.mockResolvedValueOnce({ ...activeLink, expiresAt: new Date(Date.now() - 1) });
        expect(await revokeReportShareLink("scan_1")).toEqual(none);
        expect(revokeMock).not.toHaveBeenCalled();
    });

    it("rejects malformed ids", async () => {
        authMock.mockResolvedValue({ user: { id: "owner_1" } });
        expect((await revokeReportShareLink("")).ok).toBe(false);
    });
});
