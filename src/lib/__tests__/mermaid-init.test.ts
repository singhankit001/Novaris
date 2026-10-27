import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getContrastRatio } from "@/lib/color-contrast";
import { MERMAID_THEME_CSS, MERMAID_THEME_VARIABLES } from "@/lib/mermaid-init";

const mermaidInitSource = readFileSync(
    path.resolve(process.cwd(), "src/lib/mermaid-init.ts"),
    "utf8"
);

describe("mermaid init theme", () => {
    it("uses light surfaces and readable electric blue and violet diagram colors", () => {
        expect(MERMAID_THEME_VARIABLES.primaryColor).toBe("#e6ebff");
        expect(MERMAID_THEME_VARIABLES.mainBkg).toBe("#ffffff");
        expect(MERMAID_THEME_VARIABLES.nodeTextColor).toBe("#14161d");
        expect(MERMAID_THEME_VARIABLES.lineColor).toBe("#2f54ff");
        expect(MERMAID_THEME_VARIABLES.rowOdd).toBe("#f4f1ff");
        expect(MERMAID_THEME_VARIABLES.rowEven).toBe("#ffffff");
        for (const surface of [MERMAID_THEME_VARIABLES.primaryColor, MERMAID_THEME_VARIABLES.mainBkg, MERMAID_THEME_VARIABLES.rowOdd]) {
            expect(getContrastRatio(MERMAID_THEME_VARIABLES.nodeTextColor, surface)).toBeGreaterThanOrEqual(4.5);
        }
        expect(MERMAID_THEME_CSS).toContain(".er .entityBox");
        expect(MERMAID_THEME_CSS).toContain(".er .relationshipLabelBox");
        expect(MERMAID_THEME_CSS).toContain(".er g.row-rect-odd path");
        expect(MERMAID_THEME_CSS).toContain(".er .label");
    });

    it("provides xychart defaults and shared edge/node style hooks", () => {
        expect(MERMAID_THEME_VARIABLES.xyChart.backgroundColor).toBe("transparent");
        expect(MERMAID_THEME_VARIABLES.xyChart.plotColorPalette).toContain("#e6ebff");
        expect(MERMAID_THEME_CSS).not.toContain(".mindmap .node:nth-of-type");
        expect(MERMAID_THEME_CSS).not.toContain(".xychart .plot");
        expect(MERMAID_THEME_CSS).toContain(".edgePath path");
        expect(MERMAID_THEME_CSS).toContain("stroke-width: 1.5px");
        expect(MERMAID_THEME_CSS).toContain(".cluster rect");
    });

    it("sets compact tidy-tree defaults for mindmaps", () => {
        expect(mermaidInitSource).toContain("layoutAlgorithm: \"tidy-tree\"");
        expect(mermaidInitSource).toContain("maxNodeWidth: 170");
        expect(mermaidInitSource).toContain("padding: 6");
    });
});
