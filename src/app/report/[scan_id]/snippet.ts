export interface ParsedSnippet {
    code: string;
    /** Absolute line number of the first line. */
    startLine: number;
}

/**
 * Scanner snippets are stored as "<line>| <text>" rows. Returns the plain code and its real first
 * line number, or null when the snippet carries no line numbers (model-written snippets), so the
 * caller never invents a numbering.
 */
export function parseSnippet(snippet: string): ParsedSnippet | null {
    const rows = snippet.replace(/\n$/, "").split("\n");
    const numbers: number[] = [];
    const code: string[] = [];
    for (const row of rows) {
        const match = /^(\d+)\| ?(.*)$/.exec(row);
        if (!match) return null;
        numbers.push(Number(match[1]));
        code.push(match[2] ?? "");
    }
    if (numbers.length === 0) return null;
    for (let i = 1; i < numbers.length; i += 1) {
        if (numbers[i] !== (numbers[i - 1] ?? 0) + 1) return null;
    }
    return { code: code.join("\n"), startLine: numbers[0] ?? 1 };
}

/** GitHub link for a cited file. Path segments are encoded; the default branch may differ from the scanned commit. */
export function buildFileHref(owner: string, repo: string, file: string, line?: number): string {
    const path = file
        .split("/")
        .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
        .map(encodeURIComponent)
        .join("/");
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/HEAD/${path}${line ? `#L${line}` : ""}`;
}
