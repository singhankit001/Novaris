import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    getSessionUserIdMock,
    getScanResultWithStatusMock,
    canAccessPrivateReportMock,
    createFalsePositiveSubmissionMock,
    trackReportConversionEventMock,
    peekScanFromShareTokenMock,
} = vi.hoisted(() => ({
    peekScanFromShareTokenMock: vi.fn(),
    authMock: vi.fn(),
    getSessionUserIdMock: vi.fn(),
    getScanResultWithStatusMock: vi.fn(),
    canAccessPrivateReportMock: vi.fn(),
    createFalsePositiveSubmissionMock: vi.fn(),
    trackReportConversionEventMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/session-guard", () => ({
    getSessionUserId: getSessionUserIdMock,
}));

vi.mock("@/lib/services/scan-storage", () => ({
    getScanResultWithStatus: getScanResultWithStatusMock,
    saveScanResult: vi.fn(),
    getLatestScanId: vi.fn(),
}));

vi.mock("@/lib/services/scan-share-links", () => ({
    createScanShareLink: vi.fn(),
    resolveScanFromShareToken: vi.fn(),
    peekScanFromShareToken: peekScanFromShareTokenMock,
}));

vi.mock("@/lib/services/report-access", () => ({
    canAccessPrivateReport: canAccessPrivateReportMock,
}));

vi.mock("@/lib/services/report-false-positives", () => ({
    createFalsePositiveSubmission: createFalsePositiveSubmissionMock,
    updateFalsePositiveStatus: vi.fn(),
}));

vi.mock("@/lib/analytics", async () => {
    const actual = await vi.importActual<typeof import("@/lib/analytics")>("@/lib/analytics");
    return {
        ...actual,
        trackReportConversionEvent: trackReportConversionEventMock,
    };
});

import { submitReportFalsePositive } from "@/app/actions";

describe("submitReportFalsePositive", () => {
    beforeEach(() => {
        authMock.mockReset();
        getSessionUserIdMock.mockReset();
        getScanResultWithStatusMock.mockReset();
        canAccessPrivateReportMock.mockReset();
        createFalsePositiveSubmissionMock.mockReset();
        trackReportConversionEventMock.mockReset();
        peekScanFromShareTokenMock.mockReset();

        authMock.mockResolvedValue({ user: { id: "user_1" } });
        getSessionUserIdMock.mockReturnValue("user_1");
        canAccessPrivateReportMock.mockReturnValue(true);
        getScanResultWithStatusMock.mockResolvedValue({
            status: "ok",
            scan: {
                id: "scan_1",
                owner: "acme",
                repo: "widget",
                timestamp: Date.now(),
                expiresAt: Date.now() + 60_000,
                depth: "deep",
                summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, info: 0 },
                findings: [{
                    type: "code",
                    severity: "high",
                    title: "Potential SQL Injection",
                    description: "User input reaches query sink.",
                    file: "src/api.ts",
                    line: 42,
                    recommendation: "Use parameterized queries.",
                    confidence: "high",
                }],
            },
        });
    });

    it("writes a submission for private report access and tracks analytics", async () => {
        await submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            reason: "FALSE_DATAFLOW",
            details: "The query builder parameterizes this path before execution.",
        });

        expect(createFalsePositiveSubmissionMock).toHaveBeenCalledWith(expect.objectContaining({
            scanId: "scan_1",
            submittedByUserId: "user_1",
            isSharedView: false,
            reason: "FALSE_DATAFLOW",
            details: "The query builder parameterizes this path before execution.",
        }));
        expect(trackReportConversionEventMock).toHaveBeenCalledWith("report_false_positive_flagged", "scan_1", {
            actorUsername: null,
        });
    });

    it("allows anonymous shared-view submissions that present a share token for the same scan", async () => {
        authMock.mockResolvedValue(null);
        getSessionUserIdMock.mockReturnValue(undefined);
        canAccessPrivateReportMock.mockReturnValue(false);
        peekScanFromShareTokenMock.mockResolvedValue({ status: "ok", scanId: "scan_1", linkId: "l1", expiresAt: new Date() });

        await submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            shareToken: "a".repeat(43),
            reason: "OTHER",
            details: "Shared reviewer notes",
        });

        expect(createFalsePositiveSubmissionMock).toHaveBeenCalledWith(expect.objectContaining({
            submittedByUserId: null,
            isSharedView: true,
        }));
    });

    it("rejects anonymous submissions without access, or with a token for a different scan", async () => {
        authMock.mockResolvedValue(null);
        getSessionUserIdMock.mockReturnValue(undefined);
        canAccessPrivateReportMock.mockReturnValue(false);
        const base = {
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            reason: "OTHER" as const,
            details: "notes",
        };

        await expect(submitReportFalsePositive(base)).rejects.toThrow("Forbidden");

        peekScanFromShareTokenMock.mockResolvedValue({ status: "ok", scanId: "other_scan", linkId: "l2", expiresAt: new Date() });
        await expect(submitReportFalsePositive({ ...base, shareToken: "b".repeat(43) })).rejects.toThrow("Forbidden");

        peekScanFromShareTokenMock.mockResolvedValue({ status: "revoked" });
        await expect(submitReportFalsePositive({ ...base, shareToken: "c".repeat(43) })).rejects.toThrow("Forbidden");

        expect(createFalsePositiveSubmissionMock).not.toHaveBeenCalled();
    });

    it("rejects empty details", async () => {
        await expect(submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            reason: "NOT_A_VULNERABILITY",
            details: "   ",
        })).rejects.toThrow("Please include details for the false positive report");

        expect(createFalsePositiveSubmissionMock).not.toHaveBeenCalled();
    });
});
