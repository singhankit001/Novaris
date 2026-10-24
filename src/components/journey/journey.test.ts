import { describe, expect, it } from "vitest";
import {
    PROFILE_STAGE_LABELS,
    REPO_STAGE_LABELS,
    buildProfileScene,
    buildRepoScene,
    classifyFailure,
    countDone,
    describeStage,
    initialStages,
    languageColor,
    stagesReducer,
    statusLine,
    type ProfileFacts,
    type RepoFacts,
} from "./model";
import { buildRelationGraph, languageDistribution, selectionFromId, idFromSelection } from "./graph";
import { isLowPower } from "./capabilities";

const repos = [
    { repo: "a", stars: 100, forks: 3, language: "TypeScript" },
    { repo: "b", stars: 10, forks: 1, language: "TypeScript" },
    { repo: "c", stars: 0, forks: 0, language: null },
    { repo: "d", stars: 5, forks: 0, language: "Rust" },
];

describe("stage model", () => {
    it("starts pending and moves through start, done, fail from real events", () => {
        let s = initialStages<ProfileFacts>(PROFILE_STAGE_LABELS);
        expect(s.every((x) => x.status === "pending")).toBe(true);
        s = stagesReducer(s, { type: "start", id: "profile" });
        expect(s[0].status).toBe("active");
        s = stagesReducer(s, { type: "done", id: "profile", facts: { publicRepos: 12, followers: 1500, following: 2 } });
        expect(describeStage(s[0])).toBe("12 public repositories, 1,500 followers");
        s = stagesReducer(s, { type: "fail", id: "repos" });
        expect(s.find((x) => x.id === "repos")?.status).toBe("failed");
        expect(countDone(s)).toBe(1);
        expect(stagesReducer(s, { type: "reset" }).every((x) => x.status === "pending" && x.facts === null)).toBe(true);
    });

    it("formats counts from facts only", () => {
        let s = initialStages<RepoFacts>(REPO_STAGE_LABELS);
        s = stagesReducer(s, { type: "done", id: "structure", facts: { files: 34466, folders: 21, hidden: 3 } });
        expect(describeStage(s[1])).toBe("34,466 files in 21 top-level folders, 3 paths left out");
        s = stagesReducer(s, { type: "done", id: "index", facts: { ready: false } });
        expect(describeStage(s[2])).toBe("Building in the background");
        expect(statusLine("o/r", s)).toContain("Search index");
    });

    it("handles zero repositories and unavailable commits", () => {
        let s = initialStages<ProfileFacts>(PROFILE_STAGE_LABELS);
        s = stagesReducer(s, { type: "done", id: "repos", facts: { count: 0, languages: 0, topLanguage: null, stars: 0 } });
        s = stagesReducer(s, { type: "done", id: "commits", facts: { count: 0, freshness: "GitHub API Unavailable", available: false } });
        expect(describeStage(s[2])).toBe("No public repositories");
        expect(describeStage(s[3])).toBe("GitHub did not return commits");
    });
});

describe("failure classification", () => {
    it("separates rate limit, not found, invalid and generic", () => {
        expect(classifyFailure("API rate limit exceeded").kind).toBe("rate-limit");
        expect(classifyFailure("Not Found").kind).toBe("not-found");
        expect(classifyFailure("Invalid input format").kind).toBe("invalid");
        expect(classifyFailure("boom").kind).toBe("generic");
    });
});

describe("scene model", () => {
    it("sizes by stars, colours by language, links core and same-language repos", () => {
        const m = buildProfileScene({ login: "u" }, repos, [{ repo: "a", message: "x", date: null, sha: "1" }, { repo: "zz", message: "y", date: null, sha: "2" }]);
        expect(m.nodes.map((n) => n.id)).toEqual(["a", "b", "d", "c"]);
        expect(m.nodes[0].weight).toBe(1);
        expect(m.nodes[0].color).toBe(languageColor("TypeScript"));
        expect(m.links.filter((l) => l.kind === "core")).toHaveLength(4);
        expect(m.links.filter((l) => l.kind === "group")).toEqual([{ from: 0, to: 1, kind: "group" }]);
        expect(m.commits).toEqual([0, -1]);
    });

    it("builds repo folders sized by file count", () => {
        const files = [
            { path: "src/a.ts", type: "blob" as const, sha: "1" },
            { path: "src/b.ts", type: "blob" as const, sha: "2" },
            { path: "docs/x.md", type: "blob" as const, sha: "3" },
            { path: "README.md", type: "blob" as const, sha: "4" },
        ];
        const m = buildRepoScene({ full_name: "o/r", language: null }, files);
        expect(m.nodes.map((n) => [n.id, n.meta])).toEqual([["src/", "2 files"], ["docs/", "1 file"], ["(root files)", "1 file"]]);
        expect(m.nodes[0].weight).toBe(1);
    });

    it("returns an empty constellation for no repositories", () => {
        expect(buildProfileScene({ login: "u" }, [], []).nodes).toEqual([]);
    });
});

describe("relationship graph", () => {
    it("links user to repositories and repositories to their language", () => {
        const g = buildRelationGraph("u", repos);
        expect(g.nodes.filter((n) => n.id.startsWith("lang:")).map((n) => n.id).sort()).toEqual(["lang:Rust", "lang:TypeScript"]);
        expect(g.edges.filter((e) => e.source === "user")).toHaveLength(4);
        expect(g.edges.filter((e) => e.target === "lang:TypeScript")).toHaveLength(2);
    });
    it("round-trips selections", () => {
        expect(idFromSelection(selectionFromId("repo:a"))).toBe("repo:a");
        expect(selectionFromId("nope")).toBeNull();
    });
    it("language distribution sums to 100 and collapses the tail", () => {
        const many = Array.from({ length: 9 }, (_, i) => ({ repo: `r${i}`, stars: 0, forks: 0, language: `L${i}` }));
        const d = languageDistribution(many, 6);
        expect(d.segments.at(-1)?.label).toBe("Other");
        expect(d.segments.reduce((a, s) => a + s.percent, 0)).toBeCloseTo(100);
        expect(languageDistribution([{ repo: "x", stars: 0, forks: 0, language: null }]).segments).toEqual([]);
    });
});

describe("device capability", () => {
    it("treats small, few-core or low-memory devices as low power", () => {
        expect(isLowPower({ width: 390, cores: 8, memoryGb: 8 })).toBe(true);
        expect(isLowPower({ width: 1440, cores: 4, memoryGb: 8 })).toBe(true);
        expect(isLowPower({ width: 1440, cores: 8, memoryGb: 4 })).toBe(true);
        expect(isLowPower({ width: 1440, cores: 10, memoryGb: 8 })).toBe(false);
        expect(isLowPower({ width: 1440, cores: undefined, memoryGb: undefined })).toBe(false);
    });
});
