import type { StoredScan } from "@/lib/services/scan-storage";
import { stripEmojiCharacters } from "@/lib/no-emoji";

export type ExportOutcome = { ok: true; message: string } | { ok: false; message: string };

const severityLabels: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Info",
};

export function buildMarkdownReport(scan: StoredScan): string {
    const when = new Date(scan.timestamp);
    let md = `# Security Scan Report: ${scan.owner}/${scan.repo}\n\n`;
    md += `**Generated:** ${when.toLocaleDateString()} at ${when.toLocaleTimeString()}\n`;
    md += `**Analyzer:** Novaris\n`;
    md += `**Depth:** ${scan.depth === "deep" ? "Deep Analysis" : "Quick Scan"}\n\n---\n\n`;
    md += `> **Summary**\n`;
    if (scan.findings.length === 0) {
        md += `> No findings were recorded for this scan configuration.\n\n`;
    } else {
        md += `> ${scan.summary.critical} Critical, ${scan.summary.high} High, ${scan.summary.medium} Medium and ${scan.summary.low} Low severity findings were recorded.\n\n`;
        md += `## Findings\n\n`;
        for (const finding of scan.findings) {
            md += `### [${severityLabels[finding.severity] || "Info"}] ${finding.title}\n\n`;
            md += `- **Location**: \`${finding.file}\`${finding.line ? ` (Line ${finding.line})` : ""}\n`;
            md += `- **Type**: ${finding.type}\n`;
            if (finding.cwe) md += `- **CWE**: ${finding.cwe}\n`;
            if (finding.cvss) md += `- **CVSS Score**: ${finding.cvss}\n`;
            md += `\n**Description**\n${finding.description}\n\n`;
            md += `**Recommendation**\n${finding.recommendation}\n\n`;
            if (finding.snippet) {
                const lang = finding.file.split(".").pop() || "text";
                md += `**Code Snippet**\n\`\`\`${lang}\n${finding.snippet}\n\`\`\`\n\n`;
            }
            md += `---\n\n`;
        }
    }
    return stripEmojiCharacters(md);
}

/** Downloads the report as a Markdown file. Reports the real outcome. */
export function downloadMarkdownReport(scan: StoredScan): ExportOutcome {
    try {
        const url = URL.createObjectURL(new Blob([buildMarkdownReport(scan)], { type: "text/markdown" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `novaris-scan-${scan.owner}-${scan.repo}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { ok: true, message: "Markdown report download started." };
    } catch {
        return { ok: false, message: "The browser could not create the Markdown file." };
    }
}

/** Opens the browser print dialog; the user picks "Save as PDF" there. Nothing is generated on the server. */
export function openPrintDialog(): ExportOutcome {
    try {
        window.print();
        return { ok: true, message: "Print dialog opened. Choose Save as PDF to export." };
    } catch {
        return { ok: false, message: "The browser blocked the print dialog." };
    }
}
