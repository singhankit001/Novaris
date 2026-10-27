import { describe, expect, it } from "vitest";
import { buildFileHref, parseSnippet } from "./snippet";

describe("parseSnippet", () => {
    it("strips line prefixes and reports the real first line", () => {
        expect(parseSnippet("41| const a = 1;\n42| eval(a);\n43| ")).toEqual({
            code: "const a = 1;\neval(a);\n",
            startLine: 41,
        });
    });

    it("returns null for snippets without line numbers instead of inventing them", () => {
        expect(parseSnippet("const a = 1;\neval(a);")).toBeNull();
    });

    it("returns null when numbering is not contiguous", () => {
        expect(parseSnippet("1| a\n3| b")).toBeNull();
    });
});

describe("buildFileHref", () => {
    it("encodes segments and drops traversal parts", () => {
        expect(buildFileHref("acme", "widget", "src/../a b/c#d.ts", 7)).toBe(
            "https://github.com/acme/widget/blob/HEAD/src/a%20b/c%23d.ts#L7",
        );
    });
});
