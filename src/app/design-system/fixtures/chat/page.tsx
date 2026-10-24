"use client";

import { useState, useSyncExternalStore } from "react";
import { Gauge, GitFork, Layers, Network, Shield, Workflow } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatHero } from "@/components/chat/ChatHero";
import { WorkspaceToolbar } from "@/components/chat/WorkspaceToolbar";
import { ChatInput } from "@/components/ChatInput";
import { FilePreview } from "@/components/FilePreview";
import { RepoLayout } from "@/components/RepoLayout";
import { ProfileChatInterface } from "@/components/ProfileChatInterface";
import type { FileNode, GitHubRepo } from "@/lib/github";
import type { RepoChatMessage } from "@/lib/chat-types";
import type { ModelPreference } from "@/lib/ai-client";

// Every message below is FIXTURE DATA for visual review only. It is not model output.
const FILES = [
    "src/server/router.ts",
    "src/server/middleware/auth.ts",
    "src/lib/cache.ts",
    "src/app/layout.tsx",
    "scripts/build.sh",
    "package.json",
    "README.md",
].map((path) => ({ path }));

const ANSWER = `## How requests move through the server

The server is a thin **routing layer** over a cache. Every request passes three stages, in this order:

1. Authentication in \`src/server/middleware/auth.ts:12-38\` rejects unsigned requests.
2. The router in \`src/server/router.ts:42-71\` matches a handler by path and method.
3. Handlers read through \`src/lib/cache.ts\`, which falls back to the source of truth on a miss.

> Nothing in the router mutates global state, so handlers can be tested in isolation.

### Request budget by route

| Route | Method | p50 latency | Cached |
|---|---|---:|:---:|
| \`/api/repos\` | GET | 42 ms | yes |
| \`/api/repos/:id\` | GET | 118 ms | yes |
| \`/api/scan\` | POST | 1,240 ms | no |

### The matcher

\`\`\`ts
// src/server/router.ts
export function match(routes: Route[], req: Request): Route | null {
  const url = new URL(req.url);
  for (const route of routes) {
    if (route.method !== req.method) continue;
    const hit = route.pattern.exec(url.pathname);
    if (hit) return { ...route, params: hit.groups ?? {} };
  }
  return null;
}
\`\`\`

The same flow in Python, as used by the build helper:

\`\`\`python
def match(routes, method, path):
    for route in routes:
        if route["method"] != method:
            continue
        if (hit := route["pattern"].fullmatch(path)):
            return {**route, "params": hit.groupdict()}
    return None
\`\`\`

\`\`\`bash
# scripts/build.sh
bun install --frozen-lockfile
bun run build && bun test
\`\`\`

\`\`\`json
{ "name": "fixture-server", "scripts": { "build": "tsc -p .", "test": "vitest run" } }
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Request] --> B{Authenticated?}
  B -- no --> C[401]
  B -- yes --> D[Router]
  D --> E[Handler]
  E --> F[(Cache)]
  F -- miss --> G[Source of truth]
\`\`\`

Use \`match\` first, then inspect \`params\`. See [the README](https://github.com/fixture/server#readme) for deployment notes.`;

const MESSAGES: RepoChatMessage[] = [
    { id: "u1", role: "user", content: "Walk me through how a request is handled, and show the router code.", taggedFiles: ["src/server/router.ts"] },
    {
        id: "m1",
        role: "model",
        content: ANSWER,
        modelUsed: "flash",
        relevantFiles: ["src/server/router.ts", "src/server/middleware/auth.ts", "src/lib/cache.ts", "package.json"],
        toolsUsed: ["getFile", "searchCode"],
        commitFreshnessLabel: "Commit data fresh as of 4 minutes ago",
        sourceScope: "default branch",
    },
    { id: "u2", role: "user", content: "Why is the scan route not cached?" },
    {
        id: "m2",
        role: "model",
        modelUsed: "thinking",
        reasoningSteps: ["**Locating the route** Found `/api/scan` in src/server/router.ts", "**Checking cache policy** Reads in src/lib/cache.ts only wrap GET handlers", "Tool: Calling getFile: src/lib/cache.ts"],
        content: "Scans are **POST** requests with side effects, and `src/lib/cache.ts:20-33` only wraps `GET` handlers. Caching a write would return a stale result for a new scan.",
        relevantFiles: ["src/lib/cache.ts"],
    },
    { id: "u3", role: "user", content: "List every file that imports the cache." },
    { id: "m3", role: "model", modelUsed: "flash", content: "Reading the import graph. So far `src/server/router.ts` and `src/app/layout.tsx` import it, and", streamStatus: "Reading 14 files" },
    { id: "u4", role: "user", content: "Summarise the open security issues." },
    {
        id: "m4",
        role: "model",
        modelUsed: "flash",
        content: "",
        failure: { code: "AI_TIMEOUT", message: "The model took too long to answer.", retryable: true },
    },
];

const TREE: FileNode[] = ([
    "src", "src/server", "src/server/middleware", "src/lib", "src/app", "scripts",
] as string[]).map((path, i): FileNode => ({ path, type: "tree", sha: `t${i}` })).concat(
    FILES.map((f, i): FileNode => ({ path: f.path, type: "blob", sha: `b${i}` })),
);

const REPO: GitHubRepo = {
    name: "server", full_name: "fixture/server", description: "A thin routing layer over a cache. Fixture data.", html_url: "https://github.com/fixture/server",
    stargazers_count: 18234, language: "TypeScript", forks_count: 2411, open_issues_count: 37, default_branch: "main", owner: { login: "vercel" }, updated_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
};

/** `?mode=workspace` and `?mode=profile` mount the full workspaces with fixture data. */
export default function ChatFixturePage() {
    const mode = useSyncExternalStore(
        () => () => {},
        () => new URLSearchParams(window.location.search).get("mode") ?? "parts",
        () => "parts",
    );
    if (mode === "workspace") return <RepoLayout fileTree={TREE} repoName="vercel/server" owner="vercel" repo="server" repoData={REPO} />;
    if (mode === "profile") {
        return (
            <ProfileChatInterface
                profile={{ login: "fixture-dev", avatar_url: "https://github.com/vercel.png", html_url: "https://github.com/vercel", name: "Fixture Developer", bio: "Builds routers.", location: "Berlin", blog: null, public_repos: 48, followers: 1204, following: 12, created_at: "2016-03-01T00:00:00Z" }}
                profileReadme="# Hi"
                repoReadmes={[{ repo: "router", content: "x", updated_at: "2026-01-01", description: "A tiny request router with a cache.", stars: 812, forks: 40, language: "TypeScript" }, { repo: "cache-kit", content: "x", updated_at: "2026-01-01", description: null, stars: 95, forks: 3, language: "Rust" }]}
                recentCommits={[{ repo: "router", message: "fix: params", date: null, sha: "abc1234" }]}
                recentCommitFreshnessLabel="Commit data fresh as of 4 minutes ago"
            />
        );
    }
    return <ChatFixtureParts />;
}

function ChatFixtureParts() {
    const [input, setInput] = useState("");
    const [pref, setPref] = useState<ModelPreference>("flash");
    const [tagged, setTagged] = useState<string[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [opened, setOpened] = useState<string | null>(null);

    return (
        <div className="min-h-dvh bg-nv-graphite-950">
            <section aria-label="Empty thread" className="border-b border-nv-graphite-700 bg-nv-graphite-950 pb-10">
                <p className="nv-eyebrow px-6 pt-6">Fixture · empty thread</p>
                <ChatHero
                    eyebrow="Repository workspace"
                    lead="Ask anything about"
                    accent="vercel/next.js"
                    facts={["2,314 files indexed", "Owned by Vercel"]}
                    suggestions={[
                        { label: "Show me the user flow chart", hint: "A diagram of how people move through the app", icon: <Workflow className="size-[1.1rem]" /> },
                        { label: "Evaluate code quality", hint: "Structure, tests, risks and where to improve", icon: <Gauge className="size-[1.1rem]" /> },
                        { label: "What's the tech stack?", hint: "Languages, frameworks and tooling in use", icon: <Layers className="size-[1.1rem]" /> },
                        { label: "Explain the architecture", hint: "Core modules, data flow and a diagram", icon: <Network className="size-[1.1rem]" /> },
                    ]}
                    onPick={setInput}
                />
            </section>

            <section aria-label="Conversation" className="relative flex min-h-dvh flex-col">
                <WorkspaceToolbar
                    segments={[
                        { id: "architecture", label: "Architecture", icon: <GitFork className="size-3.5" />, onClick: () => {} },
                        { id: "security", label: "Security", icon: <Shield className="size-3.5" />, onClick: () => {} },
                    ]}
                    meters={{ tokens: { used: "38.2K", max: "200K", fill: 0.19, level: "safe" }, quota: { remaining: 22, limit: 30, exhausted: false, onClick: () => {} } }}
                    onExport={() => {}}
                    onClear={() => {}}
                />
                <div className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col gap-10 px-4 pb-12 pt-8 sm:px-6">
                    {MESSAGES.map((m, i) => (
                        <ChatMessage
                            key={m.id}
                            message={m}
                            allMessages={MESSAGES}
                            streaming={m.id === "m3"}
                            currentOwner="fixture"
                            currentRepo="server"
                            fileTree={FILES}
                            onCopy={(msg) => setCopied(msg.id)}
                            copied={copied === m.id}
                            onRetry={() => setCopied(`retry-${i}`)}
                            onOpenFile={setOpened}
                        />
                    ))}
                    {opened && <p role="status" className="nv-num m-0 text-nv-small text-nv-ivory-300">Opened: {opened}</p>}
                </div>
                <div className="sticky bottom-0 z-30 px-3 pb-4 pt-1 sm:px-6">
                    <div className="mx-auto w-full max-w-[46rem]">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <ChatInput
                                value={input}
                                onChange={setInput}
                                onSubmit={() => setInput("")}
                                placeholder="Ask anything about this repository (use @ or drop to tag)..."
                                repositoryFiles={FILES}
                                taggedFiles={tagged}
                                onTaggedFilesChange={setTagged}
                                modelPreference={pref}
                                setModelPreference={setPref}
                            />
                        </form>
                    </div>
                </div>
            </section>

            <section aria-label="File preview panel" className="border-t border-nv-graphite-700">
                <p className="nv-eyebrow px-6 pt-6">Fixture · preview panel</p>
                <div className="mx-auto h-[28rem] max-w-xl p-6">
                    <div className="h-full overflow-hidden rounded-nv-lg border border-nv-graphite-700 shadow-nv-card">
                        <FilePreview variant="panel" isOpen filePath="package.json" repoOwner="vercel" repoName="next.js" onClose={() => {}} />
                    </div>
                </div>
            </section>
        </div>
    );
}
