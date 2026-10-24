import type { Edge, Node } from "@xyflow/react";
import { languageColor, summarizeLanguages, type RepoSummary } from "./model";

export type RelationSelection = { kind: "user" } | { kind: "repo"; name: string } | { kind: "lang"; name: string };

export function selectionFromId(id: string | null): RelationSelection | null {
    if (!id) return null;
    if (id === "user") return { kind: "user" };
    if (id.startsWith("repo:")) return { kind: "repo", name: id.slice(5) };
    if (id.startsWith("lang:")) return { kind: "lang", name: id.slice(5) };
    return null;
}
export function idFromSelection(sel: RelationSelection | null): string | null {
    if (!sel) return null;
    return sel.kind === "user" ? "user" : `${sel.kind}:${sel.name}`;
}

const REPO_LIMIT = 10;
const COL = { user: 0, repo: 280, lang: 580 } as const;

/** user -> repositories -> languages, all from the fetched repository list. */
export function buildRelationGraph(login: string, repos: RepoSummary[]): { nodes: Node[]; edges: Edge[] } {
    const top = [...repos].sort((a, b) => b.stars - a.stars).slice(0, REPO_LIMIT);
    const langs = summarizeLanguages(top).map((l) => l.language);
    const rowH = 64;
    const height = Math.max(top.length, langs.length, 1) * rowH;
    const place = (i: number, count: number) => (height - count * rowH) / 2 + i * rowH;

    const nodes: Node[] = [
        {
            id: "user",
            className: "nv-user",
            position: { x: COL.user, y: height / 2 - 20 },
            data: { label: `@${login}` },
            ariaLabel: `Developer ${login}`,
            sourcePosition: "right" as Node["sourcePosition"],
            targetPosition: "left" as Node["targetPosition"],
        },
        ...top.map((r, i) => ({
            id: `repo:${r.repo}`,
            position: { x: COL.repo, y: place(i, top.length) },
            data: { label: `${r.repo} · ${r.stars.toLocaleString("en-US")}★` },
            ariaLabel: `Repository ${r.repo}, ${r.stars} stars`,
            sourcePosition: "right" as Node["sourcePosition"],
            targetPosition: "left" as Node["targetPosition"],
        })),
        ...langs.map((l, i) => ({
            id: `lang:${l}`,
            className: "nv-lang",
            position: { x: COL.lang, y: place(i, langs.length) },
            data: { label: l },
            ariaLabel: `Language ${l}`,
            sourcePosition: "right" as Node["sourcePosition"],
            targetPosition: "left" as Node["targetPosition"],
        })),
    ];
    const edges: Edge[] = [
        ...top.map((r) => ({ id: `u-${r.repo}`, source: "user", target: `repo:${r.repo}`, animated: true, style: { stroke: "#9aa6ff" } })),
        ...top.filter((r) => r.language).map((r) => ({ id: `l-${r.repo}`, source: `repo:${r.repo}`, target: `lang:${r.language}`, style: { stroke: languageColor(r.language), strokeWidth: 1.6 } })),
    ];
    return { nodes, edges };
}

export interface DonutSegment {
    label: string;
    count: number;
    percent: number;
    color: string;
}

/** Top languages by repository count; the tail collapses into "Other". Percent sums to 100. */
export function languageDistribution(repos: RepoSummary[], keep = 6): { segments: DonutSegment[]; withLanguage: number } {
    const langs = summarizeLanguages(repos);
    const withLanguage = langs.reduce((a, l) => a + l.repos, 0);
    if (withLanguage === 0) return { segments: [], withLanguage: 0 };
    const head = langs.slice(0, keep).map((l) => ({ label: l.language, count: l.repos, color: languageColor(l.language) }));
    const rest = langs.slice(keep).reduce((a, l) => a + l.repos, 0);
    if (rest > 0) head.push({ label: "Other", count: rest, color: "#9aa1b2" });
    return { segments: head.map((h) => ({ ...h, percent: (h.count / withLanguage) * 100 })), withLanguage };
}
