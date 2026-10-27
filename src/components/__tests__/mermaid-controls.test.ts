import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mermaidComponentSource = readFileSync(
    path.resolve(process.cwd(), "src/components/Mermaid.tsx"),
    "utf8"
);

describe("Mermaid raw/preview controls", () => {
    it("supports optional rawCode prop and raw-preview toggle state", () => {
        expect(mermaidComponentSource).toContain("rawCode?: string");
        expect(mermaidComponentSource).toContain("const [isRawView, setIsRawView] = useState(false);");
        expect(mermaidComponentSource).toContain("setIsRawView((p) => !p)");
    });

    it("includes copy handler for Mermaid raw code", () => {
        expect(mermaidComponentSource).toContain("const handleCopyRawCode = async");
        expect(mermaidComponentSource).toContain("navigator.clipboard.writeText(activeMermaidSource)");
        expect(mermaidComponentSource).toContain("Mermaid code copied");
    });

    it("opens fullscreen only from an explicit button, and only for a finished diagram in preview mode", () => {
        expect(mermaidComponentSource).toContain("const ready = !isGenerating && Boolean(svg);");
        expect(mermaidComponentSource).toContain('aria-label="Open diagram full screen"');
        expect(mermaidComponentSource).not.toContain("cursor-zoom-in");
    });

    it("purifies Mermaid SVG before inserting it", () => {
        expect(mermaidComponentSource).toContain("DOMPurify.sanitize");
        expect(mermaidComponentSource).toContain("__html: safeSvg");
        expect(mermaidComponentSource).not.toContain("__html: svg");
    });

    it("sends syntaxError and diagramType when requesting AI syntax fixes", () => {
        expect(mermaidComponentSource).toContain("syntaxError?: string");
        expect(mermaidComponentSource).toContain("diagramType?: string");
        expect(mermaidComponentSource).toContain("body: JSON.stringify(payload)");
        expect(mermaidComponentSource).toContain("const syntaxError = extractErrorMessage(renderError)");
    });
});
