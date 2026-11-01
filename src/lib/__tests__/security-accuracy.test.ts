import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai-client", () => ({ getGenAI: vi.fn(), DEFAULT_MODEL: "test" }));

import { validateFinding } from "@/lib/gemini-security";
import { osvSeverity, type SecurityFinding } from "@/lib/security-scanner";

const file = {
    path: "src/db.ts",
    content: [
        "import { Pool } from 'pg';",
        "const pool = new Pool();",
        "export async function find(req) {",
        "  const id = req.query.id;",
        "  return pool.query(`SELECT * FROM users WHERE id = ${id}`);",
        "}",
        "// padding",
        "// padding",
        "// padding",
        "// padding",
        "export const version = 1;",
    ].join("\n"),
};

function sqlFinding(line: number): SecurityFinding {
    return {
        type: "code",
        severity: "high",
        title: "SQL Injection: string interpolation",
        description: "User input from req.query reaches pool.query without parameters.",
        file: "src/db.ts",
        line,
        recommendation: "Use parameters.",
        confidence: "high",
    };
}

describe("AI finding validation", () => {
    it("keeps a finding whose cited line holds the sink", () => {
        expect(validateFinding(sqlFinding(5), [file])).toBe(true);
    });

    it("drops a finding that cites a line past the end of the file", () => {
        expect(validateFinding(sqlFinding(400), [file])).toBe(false);
    });

    it("drops a finding whose cited line is nowhere near the sink", () => {
        expect(validateFinding(sqlFinding(11), [file])).toBe(false);
    });
});

describe("osvSeverity", () => {
    it("reads the advisory label, not the CVSS vector", () => {
        expect(osvSeverity({ id: "GHSA-1", database_specific: { severity: "CRITICAL" } })).toBe("critical");
        expect(osvSeverity({ id: "GHSA-2", database_specific: { severity: "HIGH" } })).toBe("high");
        expect(osvSeverity({ id: "GHSA-3", database_specific: { severity: "MODERATE" } })).toBe("medium");
        expect(osvSeverity({ id: "GHSA-4", database_specific: { severity: "LOW" } })).toBe("low");
        expect(osvSeverity({ id: "OSV-5" })).toBe("medium");
    });
});

describe("findingFingerprint", () => {
    it("stays the same when only the cited line moves", async () => {
        const { findingFingerprint } = await import("@/lib/services/report-service");
        const base = sqlFinding(5);
        expect(findingFingerprint({ ...base, description: "Hardcoded key at line 5." })).toBe(
            findingFingerprint({ ...base, line: 9, description: "Hardcoded key at line 9." })
        );
    });
});
