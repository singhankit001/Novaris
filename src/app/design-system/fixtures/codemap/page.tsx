"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { fetchGitHubData } from "@/app/actions";
import type { FileNode } from "@/lib/github";
import { sampleFetch, sampleTree } from "./sample";

const CodebaseMap = dynamic(() => import("@/features/codemap").then((m) => m.CodebaseMap), { ssr: false });

interface Loaded {
  owner: string;
  repo: string;
  tree: FileNode[];
  sample?: boolean;
}

export default function CodemapFixture() {
  const [input, setInput] = useState("vercel/swr");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = async (value: string) => {
    setBusy(true);
    setError(null);
    const data = await fetchGitHubData(value.trim());
    setBusy(false);
    if ("error" in data && data.error) return setError(String(data.error));
    if (data.type !== "repo") return setError("Enter owner/repo");
    const [owner = "", repo = ""] = value.trim().split("/");
    setLoaded({ owner, repo, tree: data.fileTree as FileNode[] });
  };

  return (
    <main className="mx-auto flex h-dvh max-w-[1500px] flex-col gap-3 p-3 md:p-5">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(input);
        }}
      >
        <label htmlFor="cm-repo" className="text-nv-small font-medium text-nv-ivory-200">
          Repository
        </label>
        <input
          id="cm-repo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-11 w-64 rounded-nv-sm border border-nv-graphite-500 bg-nv-graphite-900 px-3 text-nv-small"
          placeholder="owner/repo"
        />
        <button type="submit" disabled={busy} className="min-h-11 rounded-nv-sm bg-nv-copper-500 px-4 text-nv-small font-medium text-nv-on-accent disabled:opacity-60">
          {busy ? "Loading..." : "Map it"}
        </button>
        <button
          type="button"
          onClick={() => setLoaded({ owner: "fixture", repo: "sample-app", tree: sampleTree, sample: true })}
          className="min-h-11 rounded-nv-sm border border-nv-graphite-500 px-4 text-nv-small font-medium"
        >
          Offline sample (fixture data)
        </button>
        {error && <span role="alert" className="text-nv-small text-nv-danger">{error}</span>}
        {note && <span className="text-nv-small text-nv-ivory-300">{note}</span>}
      </form>
      <div className="min-h-0 flex-1">
        {loaded ? (
          <CodebaseMap
            owner={loaded.owner}
            repo={loaded.repo}
            tree={loaded.tree}
            fetchFiles={loaded.sample ? sampleFetch : undefined}
            onOpenFile={(p) => setNote(`Open file: ${p}`)}
            onAskAboutFile={(p) => setNote(`Ask about: ${p}`)}
          />
        ) : (
          <p className="text-nv-small text-nv-ivory-300">Enter a public repository and press Map it.</p>
        )}
      </div>
    </main>
  );
}
