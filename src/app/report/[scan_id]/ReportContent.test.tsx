import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
    useSession: () => ({ data: { user: { id: "user_1" } } }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

vi.mock("@/app/actions", () => ({
    submitReportFalsePositive: vi.fn(),
    trackReportConversion: vi.fn(),
}));

vi.mock("@/app/report/[scan_id]/ShareControls", () => ({
    default: ({ shareMode }: { shareMode: string }) => <div>Share controls {shareMode}</div>,
}));

import { ReportContent } from "@/app/report/[scan_id]/ReportContent";

describe("ReportContent", () => {
    it("renders the top action bar and removes per-finding fix buttons", () => {
        const html = renderToStaticMarkup(
            <ReportContent
                scan={{
                    id: "scan_1",
                    owner: "acme",
                    repo: "widget",
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
                    depth: "deep",
                    summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0, info: 0 },
                    findings: [],
                    userId: "user_1",
                }}
                priorScanDiff={{ new: 1, resolved: 0, unchanged: 0 }}
                topFixes={[{
                    index: 0,
                    fingerprint: "fp-1",
                    triageScore: 120,
                    proof: "proof",
                    impact: "impact",
                    confidenceRationale: "Confidence: high",
                    fixPrompt: "legacy finding prompt",
                    chatHref: "/chat?q=acme%2Fwidget&prompt=legacy",
                    finding: {
                        type: "code",
                        severity: "critical",
                        title: "Hardcoded Secret",
                        description: "desc",
                        file: "src/api.ts",
                        line: 42,
                        recommendation: "Rotate the secret",
                        confidence: "high",
                    },
                }]}
                findingViews={[{
                    index: 0,
                    fingerprint: "fp-1",
                    triageScore: 120,
                    proof: "proof",
                    impact: "impact",
                    confidenceRationale: "Confidence: high",
                    fixPrompt: "legacy finding prompt",
                    chatHref: "/chat?q=acme%2Fwidget&prompt=legacy",
                    finding: {
                        type: "code",
                        severity: "critical",
                        title: "Hardcoded Secret",
                        description: "desc",
                        file: "src/api.ts",
                        line: 42,
                        recommendation: "Rotate the secret",
                        confidence: "high",
                    },
                }]}
                globalFixPrompt="fix all findings"
                globalChatHref="/chat?q=acme%2Fwidget&prompt=fix%20all"
                hasPreviousScan
                isSharedView={false}
                canShareReport
                canGenerateOutreach={false}
                shareMode="canonical"
                reportExpiresAt={Date.now() + 48 * 60 * 60 * 1000}
            />
        );

        // Behavioral requirements (previously asserted through old class strings).
        expect(html).toContain("Remediate with AI");
        expect(html).toContain("Talk to the codebase");
        expect(html).toContain("Repository profile");
        expect(html).toContain("Share controls canonical");
        expect(html).toContain("Copy summary");
        expect(html).toContain("Download Markdown");
        expect(html).toContain("Deep scan another repo");
        expect(html).toContain('data-testid="report-actions"');
        // Scope, severity counts, grouped findings, cited location, verification state.
        expect(html).toContain("Evidence scope");
        expect(html).toContain("Severity counts");
        expect(html).toContain("Hardcoded Secret");
        expect(html).toContain("src/api.ts");
        expect(html).toContain("Not verified (scan has no verification data)");
        expect(html).toContain("Inferred");
        expect(html).toContain("Report false positive");
        // No composite score or unsupported claims.
        expect(html).not.toContain("Security Health Score");
        expect(html).not.toContain("Verified Badge");
        expect(html).not.toContain("Copy Global Prompt");
        expect(html).not.toContain("Fix in Repo Chat");
    });

    it("shows the shared read-only marker and hides owner actions when expired", () => {
        const html = renderToStaticMarkup(
            <ReportContent
                scan={{
                    id: "scan_2",
                    owner: "acme",
                    repo: "widget",
                    timestamp: Date.now() - 10 * 86_400_000,
                    expiresAt: Date.now() - 1000,
                    depth: "quick",
                    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
                    findings: [],
                }}
                priorScanDiff={{ new: 0, resolved: 0, unchanged: 0 }}
                topFixes={[]}
                findingViews={[]}
                globalFixPrompt=""
                globalChatHref="/chat"
                hasPreviousScan={false}
                isSharedView
                shareToken="tok"
                canShareReport
                canGenerateOutreach={false}
                shareMode="copy-current-url"
                reportExpiresAt={Date.now() - 1000}
            />
        );
        expect(html).toContain("shared view, read only");
        expect(html).toContain("This report is outdated");
        expect(html).toContain("No verified findings");
        expect(html).not.toContain("Share controls");
        expect(html).not.toContain("Download Markdown");
        expect(html).not.toContain("Copy summary");
    });
});
