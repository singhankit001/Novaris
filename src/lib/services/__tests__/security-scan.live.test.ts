import { describe, expect, it } from "vitest";
import { getRepo, getRepoFileTree } from "@/lib/github";
import { buildScanConfig, runSecurityScan } from "@/lib/services/security-service";

// Real GitHub + OSV + Gemini scan of a deliberately vulnerable app. Costs API quota, so it
// runs only with LIVE_E2E=1 and GITHUB_TOKEN / GEMINI_API_KEY in the environment.
const live = Boolean(process.env.LIVE_E2E && process.env.GITHUB_TOKEN && process.env.GEMINI_API_KEY);

describe.skipIf(!live)("security scan against a real repository", () => {
    it("finds real issues in OWASP NodeGoat with valid file paths and line numbers", async () => {
        const owner = "OWASP";
        const repo = "NodeGoat";
        const meta = await getRepo(owner, repo);
        const { tree } = await getRepoFileTree(owner, repo, meta.default_branch);
        const files = tree.filter((node) => node.type === "blob").map((node) => ({ path: node.path, sha: node.sha }));

        const result = await runSecurityScan(owner, repo, files, buildScanConfig({ depth: "quick", aiAssist: "on" }), {}, files.map((f) => f.path));

        const knownPaths = new Set(files.map((f) => f.path));
        expect(result.findings.length).toBeGreaterThan(0);
        for (const finding of result.findings) {
            if (finding.file) expect(knownPaths.has(finding.file) || finding.file === "package.json").toBe(true);
            if (finding.line !== undefined) expect(finding.line).toBeGreaterThan(0);
        }
        console.log("live scan:", JSON.stringify({ summary: result.summary, meta: { depth: result.meta.depth }, sample: result.findings.slice(0, 5).map((f) => [f.severity, f.file, f.line, f.title]) }));
    }, 300_000);
});
