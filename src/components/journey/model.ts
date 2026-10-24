import type { FileNode, GitHubProfile, GitHubRepo } from "@/lib/github";
import { buildTree, summarizeTopLevel } from "@/components/repo-tree";

/* ------------------------------------------------------------------ */
/* Stage model: every stage is driven by a real promise resolution.    */
/* ------------------------------------------------------------------ */

export type StageStatus = "pending" | "active" | "done" | "failed";

export interface ProfileFacts {
    profile: { publicRepos: number; followers: number; following: number };
    readme: { found: boolean };
    repos: { count: number; languages: number; topLanguage: string | null; stars: number };
    commits: { count: number; freshness: string; available: boolean };
}

export interface RepoFacts {
    fetch: { stars: number; forks: number; branch: string; language: string | null };
    structure: { files: number; folders: number; hidden: number };
    index: { ready: boolean };
}

export type Stage<F> = {
    [K in keyof F & string]: { id: K; label: string; status: StageStatus; facts: F[K] | null };
}[keyof F & string];
export type StageEvent<F> =
    | { type: "reset" }
    | { type: "start"; id: keyof F & string }
    | { type: "done"; id: keyof F & string; facts: F[keyof F & string] }
    | { type: "fail"; id: keyof F & string };

export type ProfileStage = Stage<ProfileFacts>;
export type RepoStage = Stage<RepoFacts>;
export type AnyStage = ProfileStage | RepoStage;

export const PROFILE_STAGE_LABELS: Record<keyof ProfileFacts, string> = {
    profile: "Profile",
    readme: "Profile README",
    repos: "Repositories",
    commits: "Recent commits",
};
export const REPO_STAGE_LABELS: Record<keyof RepoFacts, string> = {
    fetch: "Repository",
    structure: "File structure",
    index: "Search index",
};

export function initialStages<F>(labels: Record<keyof F & string, string>): Stage<F>[] {
    return (Object.keys(labels) as (keyof F & string)[]).map(
        (id) => ({ id, label: labels[id], status: "pending", facts: null }) as Stage<F>,
    );
}

export function stagesReducer<F>(stages: Stage<F>[], ev: StageEvent<F>): Stage<F>[] {
    if (ev.type === "reset") return stages.map((s) => ({ ...s, status: "pending", facts: null }) as Stage<F>);
    return stages.map((s) => {
        if (s.id !== ev.id) return s;
        if (ev.type === "start") return s.status === "pending" ? { ...s, status: "active" } : s;
        if (ev.type === "fail") return { ...s, status: "failed" };
        return { ...s, status: "done", facts: ev.facts } as Stage<F>;
    });
}

const n = (v: number) => v.toLocaleString("en-US");
const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;

/** One human line per stage. Every number comes from the facts recorded when the promise resolved. */
export function describeStage(stage: AnyStage): string {
    if (stage.status === "pending") return "Waiting";
    if (stage.status === "active") return "Retrieving from GitHub";
    if (stage.status === "failed") return "Could not be retrieved";
    switch (stage.id) {
        case "profile": {
            const f = stage.facts;
            return f ? `${plural(f.publicRepos, "public repository", "public repositories")}, ${plural(f.followers, "follower")}` : "Loaded";
        }
        case "readme":
            return stage.facts?.found ? "README found" : "No profile README";
        case "repos": {
            const f = stage.facts;
            if (!f) return "Loaded";
            if (f.count === 0) return "No public repositories";
            const lang = f.topLanguage ? `, mostly ${f.topLanguage}` : "";
            return `${plural(f.count, "repository", "repositories")}, ${plural(f.languages, "language")}${lang}`;
        }
        case "commits": {
            const f = stage.facts;
            if (!f) return "Loaded";
            return f.available ? `${plural(f.count, "recent commit")}, ${f.freshness}` : "GitHub did not return commits";
        }
        case "fetch": {
            const f = stage.facts;
            return f ? `${n(f.stars)} stars, ${n(f.forks)} forks, branch ${f.branch}` : "Loaded";
        }
        case "structure": {
            const f = stage.facts;
            if (!f) return "Mapped";
            const hidden = f.hidden > 0 ? `, ${n(f.hidden)} paths left out` : "";
            return `${plural(f.files, "file")} in ${plural(f.folders, "top-level folder")}${hidden}`;
        }
        case "index":
            return stage.facts?.ready ? "Ready for instant file search" : "Building in the background";
    }
}

export function countDone(stages: AnyStage[]): number {
    return stages.filter((s) => s.status === "done").length;
}

/** The newest meaningful event, for the aria-live line. */
export function statusLine(subject: string, stages: AnyStage[]): string {
    const failed = stages.find((s) => s.status === "failed");
    if (failed) return `${failed.label} failed for ${subject}`;
    const active = stages.find((s) => s.status === "active");
    const lastDone = [...stages].reverse().find((s) => s.status === "done");
    if (active) return lastDone ? `${lastDone.label}: ${describeStage(lastDone)}. Next: ${active.label.toLowerCase()}.` : `${active.label}: ${describeStage(active)}`;
    if (stages.every((s) => s.status === "done")) return `Analysis of ${subject} complete`;
    return lastDone ? `${lastDone.label}: ${describeStage(lastDone)}` : `Opening ${subject}`;
}

/* ------------------------------------------------------------------ */
/* Failures                                                            */
/* ------------------------------------------------------------------ */

export type JourneyFailureKind = "not-found" | "rate-limit" | "invalid" | "generic";
export interface JourneyFailure {
    kind: JourneyFailureKind;
    message: string;
}

export function classifyFailure(message: string): JourneyFailure {
    const m = message.toLowerCase();
    let kind: JourneyFailureKind = "generic";
    if (/rate.?limit|too many|429|abuse/.test(m)) kind = "rate-limit";
    else if (/not found|404|does not exist/.test(m)) kind = "not-found";
    else if (/invalid input|invalid username|invalid/.test(m)) kind = "invalid";
    return { kind, message };
}

/* ------------------------------------------------------------------ */
/* Scene model: the constellation both renderers draw.                 */
/* ------------------------------------------------------------------ */

export interface SceneNode {
    id: string;
    label: string;
    meta: string;
    /** 0..1 relative size (stars for repositories, file count for folders). */
    weight: number;
    color: string;
    group: string | null;
    /** World position for the 3D scene; x and y double as 2D layout. */
    pos: [number, number, number];
}
export interface SceneLink {
    /** -1 is the core. */
    from: number;
    to: number;
    kind: "core" | "group";
}
export interface SceneModel {
    kind: "profile" | "repo";
    coreLabel: string;
    nodes: SceneNode[];
    links: SceneLink[];
    /** Node index each recent commit belongs to; -1 orbits the core. */
    commits: number[];
}

export const LANGUAGE_PALETTE = ["#2f54ff", "#7a4dff", "#19b6e6", "#d14fb5", "#0fa38f", "#e08a1e", "#5b6bff", "#4a7bd8"] as const;
const KNOWN_LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: "#2f54ff",
    JavaScript: "#e0a21e",
    Python: "#19b6e6",
    Rust: "#d1603a",
    Go: "#0fa38f",
    Java: "#c2412a",
    "C++": "#7a4dff",
    C: "#5b6bff",
    Shell: "#4aa860",
    HTML: "#d14fb5",
    CSS: "#7a4dff",
    Ruby: "#c22c4a",
};
export const SILVER = "#9aa1b2";

export function languageColor(language: string | null): string {
    if (!language) return SILVER;
    const known = KNOWN_LANGUAGE_COLORS[language];
    if (known) return known;
    let h = 0;
    for (let i = 0; i < language.length; i++) h = (h * 31 + language.charCodeAt(i)) >>> 0;
    return LANGUAGE_PALETTE[h % LANGUAGE_PALETTE.length];
}

const GOLDEN = 2.399963229728653;
/** Deterministic spiral corridor: nodes spread around the core and recede along -z. */
export function layoutNode(i: number, total: number): [number, number, number] {
    const angle = i * GOLDEN + 0.4;
    const ring = 3 + (i % 3) * 0.95 + Math.min(total, 14) * 0.04;
    return [Math.cos(angle) * ring * 1.35, Math.sin(angle) * ring * 0.72, -2.2 - i * 1.35];
}

const MAX_NODES = 14;

export interface RepoSummary {
    repo: string;
    stars: number;
    forks: number;
    language: string | null;
    description?: string | null;
    updated_at?: string;
}
export interface CommitSummary {
    repo: string;
    message: string;
    date: string | null;
    sha: string;
}

export function summarizeLanguages(repos: RepoSummary[]) {
    const byLang = new Map<string, { repos: number; stars: number }>();
    for (const r of repos) {
        if (!r.language) continue;
        const cur = byLang.get(r.language) ?? { repos: 0, stars: 0 };
        cur.repos += 1;
        cur.stars += r.stars;
        byLang.set(r.language, cur);
    }
    return [...byLang.entries()]
        .map(([language, v]) => ({ language, ...v }))
        .sort((a, b) => b.repos - a.repos || b.stars - a.stars || a.language.localeCompare(b.language));
}

export function buildProfileScene(profile: Pick<GitHubProfile, "login">, repos: RepoSummary[], commits: CommitSummary[]): SceneModel {
    const top = [...repos].sort((a, b) => b.stars - a.stars).slice(0, MAX_NODES);
    const maxStars = Math.max(...top.map((r) => r.stars), 0);
    const nodes: SceneNode[] = top.map((r, i) => ({
        id: r.repo,
        label: r.repo,
        meta: `${n(r.stars)} stars${r.language ? `, ${r.language}` : ""}`,
        weight: maxStars > 0 ? Math.log1p(r.stars) / Math.log1p(maxStars) : 0.4,
        color: languageColor(r.language),
        group: r.language,
        pos: layoutNode(i, top.length),
    }));
    return { kind: "profile", coreLabel: profile.login, nodes, links: buildLinks(nodes), commits: commits.slice(0, 20).map((c) => nodes.findIndex((nd) => nd.id === c.repo)) };
}

export function buildRepoScene(repo: Pick<GitHubRepo, "full_name" | "language">, files: FileNode[]): SceneModel {
    const { directories, rootFiles } = summarizeTopLevel(buildTree(files));
    const dirs = directories.slice(0, MAX_NODES - (rootFiles > 0 ? 1 : 0));
    const entries = dirs.map((d) => ({ id: `${d.name}/`, count: d.fileCount }));
    if (rootFiles > 0) entries.push({ id: "(root files)", count: rootFiles });
    const max = Math.max(...entries.map((e) => e.count), 0);
    const nodes: SceneNode[] = entries.map((e, i) => ({
        id: e.id,
        label: e.id,
        meta: plural(e.count, "file"),
        weight: max > 0 ? Math.sqrt(e.count / max) : 0.4,
        color: LANGUAGE_PALETTE[i % 3],
        group: null,
        pos: layoutNode(i, entries.length),
    }));
    return { kind: "repo", coreLabel: repo.full_name, nodes, links: buildLinks(nodes), commits: [] };
}

/** Core to every node, plus a chain between nodes that share a group (same language). */
export function buildLinks(nodes: SceneNode[]): SceneLink[] {
    const links: SceneLink[] = nodes.map((_, to) => ({ from: -1, to, kind: "core" as const }));
    const lastByGroup = new Map<string, number>();
    nodes.forEach((nd, i) => {
        if (!nd.group) return;
        const prev = lastByGroup.get(nd.group);
        if (prev !== undefined) links.push({ from: prev, to: i, kind: "group" });
        lastByGroup.set(nd.group, i);
    });
    return links;
}
