"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowRight, ExternalLink, GitCommitHorizontal, MapPin, Star, GitFork, Users, Layers } from "lucide-react";
import type { GitHubProfile } from "@/lib/github";
import { Button } from "@/components/nv/button";
import { buildRelationGraph, idFromSelection, languageDistribution, selectionFromId, type RelationSelection } from "./graph";
import { languageColor, summarizeLanguages, type CommitSummary, type RepoSummary } from "./model";
import s from "./workspace.module.css";

const FlowCanvas = dynamic(() => import("./FlowCanvas"), {
    ssr: false,
    loading: () => <div className={s.flowSkeleton} aria-hidden />,
});

export interface ProfileWorkspaceProps {
    profile: GitHubProfile;
    repos: (RepoSummary & { updated_at: string; description: string | null })[];
    commits: CommitSummary[];
    freshness: string;
    reducedMotion: boolean;
    onAsk: () => void;
}

const num = (v: number) => v.toLocaleString("en-US");
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "undated");

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className={s.metric}>
            <span aria-hidden className={s.metricIcon}>
                {icon}
            </span>
            <dt className="nv-eyebrow">{label}</dt>
            <dd className="nv-display nv-num text-nv-display-md">{value}</dd>
        </div>
    );
}

export function ProfileWorkspace({ profile, repos, commits, freshness, reducedMotion, onAsk }: ProfileWorkspaceProps) {
    const [selection, setSelection] = useState<RelationSelection | null>(null);
    const [showAll, setShowAll] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

    const byStars = [...repos].sort((a, b) => b.stars - a.stars);
    const totalStars = repos.reduce((a, r) => a + r.stars, 0);
    const languages = summarizeLanguages(repos);
    const dist = languageDistribution(repos);
    const graph = buildRelationGraph(profile.login, repos);
    const rows = showAll ? byStars : byStars.slice(0, 12);
    const selectedRepo = selection?.kind === "repo" ? repos.find((r) => r.repo === selection.name) : undefined;
    const selectedLang = selection?.kind === "lang" ? languages.find((l) => l.language === selection.name) : undefined;
    const rise = (i: number) => ({ animationDelay: `${i * 70}ms` });

    return (
        <div className={s.root} data-workspace="profile">
            <div className={`${s.atmosphere} nv-aurora`} aria-hidden />
            <header className={s.actionBar}>
                <span className="nv-eyebrow">Novaris · Developer intelligence</span>
                <Button variant="primary" size="lg" onClick={onAsk} trailing={<ArrowRight className="size-4" aria-hidden />} data-testid="ask-about">
                    Ask about @{profile.login}
                </Button>
            </header>

            <main className={s.main}>
                <section className={`${s.hero} nv-rise`} style={rise(0)} aria-labelledby="ws-title">
                    <Image src={profile.avatar_url} alt={`${profile.login} avatar`} width={112} height={112} className={s.avatar} unoptimized priority />
                    <div className="min-w-0">
                        <p className="nv-eyebrow">Intelligence report</p>
                        <h1 id="ws-title" ref={headingRef} tabIndex={-1} className="nv-display mt-1 break-words text-nv-display-lg !shadow-none !outline-none">
                            <span className="nv-gradient-text">{profile.name ?? profile.login}</span>
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-nv-body text-nv-ivory-200">
                            <a href={profile.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-nv-small text-nv-copper-400 hover:underline">
                                @{profile.login} <ExternalLink className="size-3" aria-hidden />
                                <span className="sr-only">(opens GitHub)</span>
                            </a>
                            {profile.location && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3.5" aria-hidden /> {profile.location}
                                </span>
                            )}
                            <span>On GitHub since {fmtDate(profile.created_at)}</span>
                        </p>
                        {profile.bio && <p className="mt-3 max-w-[var(--nv-measure)] text-nv-lead text-nv-ivory-200 text-pretty">{profile.bio}</p>}
                    </div>
                </section>

                <dl className={`${s.metrics} nv-rise`} style={rise(1)} aria-label="Profile totals">
                    <Metric icon={<Layers className="size-4" />} label="Public repositories" value={num(profile.public_repos)} />
                    <Metric icon={<Star className="size-4" />} label={`Stars in ${num(repos.length)} analysed`} value={num(totalStars)} />
                    <Metric icon={<Users className="size-4" />} label="Followers" value={num(profile.followers)} />
                    <Metric icon={<GitFork className="size-4" />} label="Languages" value={num(languages.length)} />
                </dl>

                {repos.length === 0 ? (
                    <section className={`${s.empty} nv-rise`} style={rise(2)} aria-labelledby="ws-empty">
                        <h2 id="ws-empty" className="nv-display text-nv-display-md">
                            No public repositories yet
                        </h2>
                        <p className="mt-2 max-w-[var(--nv-measure)] text-nv-body text-nv-ivory-200">
                            @{profile.login} has nothing public to chart. You can still ask about the profile
                            {profile.bio ? " and its bio" : ""}.
                        </p>
                        <div className="mt-5">
                            <Button variant="primary" onClick={onAsk}>
                                Ask about @{profile.login}
                            </Button>
                        </div>
                    </section>
                ) : (
                    <>
                        <section className={`${s.graphSection} nv-rise`} style={rise(2)} aria-labelledby="ws-graph">
                            <div className={s.graphHead}>
                                <div>
                                    <p className="nv-eyebrow">Relationships</p>
                                    <h2 id="ws-graph" className="nv-display text-nv-display-md">
                                        How the work connects
                                    </h2>
                                </div>
                                <p className="max-w-[40ch] text-nv-small text-nv-ivory-200">
                                    Developer, top {Math.min(10, repos.length)} repositories by stars, and the languages they use. Select a node, or use the table below.
                                </p>
                            </div>
                            <div className={s.graphGrid}>
                                <FlowCanvas
                                    nodes={graph.nodes}
                                    edges={graph.edges}
                                    selectedId={idFromSelection(selection)}
                                    onSelect={(id) => setSelection(selectionFromId(id))}
                                    label="Relationship graph: developer, repositories and languages"
                                    animated={!reducedMotion}
                                />
                                <aside className={s.detail} aria-live="polite" aria-label="Selection details">
                                    {selectedRepo ? (
                                        <>
                                            <p className="nv-eyebrow">Repository</p>
                                            <h3 className="nv-display mt-1 break-words text-nv-title">{selectedRepo.repo}</h3>
                                            <p className="mt-2 text-nv-small text-nv-ivory-200 text-pretty">{selectedRepo.description ?? "No description."}</p>
                                            <p className="nv-num mt-3 text-nv-small text-nv-ivory-100">
                                                {num(selectedRepo.stars)} stars · {num(selectedRepo.forks)} forks
                                            </p>
                                            <p className="mt-1 text-nv-small text-nv-ivory-200">
                                                {selectedRepo.language ?? "No primary language"} · updated {fmtDate(selectedRepo.updated_at)}
                                            </p>
                                            <a href={`${profile.html_url}/${selectedRepo.repo}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-nv-small text-nv-copper-400 hover:underline">
                                                Open on GitHub <ExternalLink className="size-3" aria-hidden />
                                            </a>
                                        </>
                                    ) : selectedLang ? (
                                        <>
                                            <p className="nv-eyebrow">Language</p>
                                            <h3 className="nv-display mt-1 text-nv-title">{selectedLang.language}</h3>
                                            <p className="nv-num mt-2 text-nv-small text-nv-ivory-100">
                                                {num(selectedLang.repos)} {selectedLang.repos === 1 ? "repository" : "repositories"} · {num(selectedLang.stars)} stars
                                            </p>
                                            <ul className="mt-3 flex flex-col gap-1 text-nv-small text-nv-ivory-200">
                                                {repos
                                                    .filter((r) => r.language === selectedLang.language)
                                                    .slice(0, 6)
                                                    .map((r) => (
                                                        <li key={r.repo} className="truncate">
                                                            {r.repo}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </>
                                    ) : (
                                        <>
                                            <p className="nv-eyebrow">Developer</p>
                                            <h3 className="nv-display mt-1 break-words text-nv-title">@{profile.login}</h3>
                                            <p className="nv-num mt-2 text-nv-small text-nv-ivory-100">
                                                {num(repos.length)} repositories · {num(languages.length)} languages · {num(totalStars)} stars
                                            </p>
                                            <p className="mt-3 text-nv-small text-nv-ivory-300">Select a repository or language to focus its details.</p>
                                        </>
                                    )}
                                </aside>
                            </div>
                        </section>

                        <div className={s.twoCol}>
                            <section className={`${s.card} nv-rise`} style={rise(3)} aria-labelledby="ws-lang">
                                <p className="nv-eyebrow">Languages</p>
                                <h2 id="ws-lang" className="nv-display text-nv-title">
                                    Language distribution
                                </h2>
                                {dist.segments.length === 0 ? (
                                    <p className="mt-4 text-nv-small text-nv-ivory-300">None of the repositories report a primary language.</p>
                                ) : (
                                    <div className={s.donutWrap}>
                                        <svg viewBox="0 0 42 42" className={s.donut} role="img" aria-label={`Language share across ${dist.withLanguage} repositories`}>
                                            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#eef0f5" strokeWidth="5" />
                                            {dist.segments.reduce<{ el: React.ReactNode[]; offset: number }>(
                                                (acc, seg) => {
                                                    acc.el.push(<circle key={seg.label} cx="21" cy="21" r="15.915" fill="none" stroke={seg.color} strokeWidth="5" strokeDasharray={`${Math.max(seg.percent - 0.6, 0.1)} ${100 - Math.max(seg.percent - 0.6, 0.1)}`} strokeDashoffset={25 - acc.offset} />);
                                                    acc.offset += seg.percent;
                                                    return acc;
                                                },
                                                { el: [], offset: 0 },
                                            ).el}
                                        </svg>
                                        <ul className={s.legend}>
                                            {dist.segments.map((seg) => (
                                                <li key={seg.label}>
                                                    <span aria-hidden className={s.swatch} style={{ background: seg.color }} />
                                                    <span className="truncate">{seg.label}</span>
                                                    <span className="nv-num ml-auto text-nv-ivory-100">
                                                        {num(seg.count)} · {seg.percent.toFixed(0)}%
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </section>

                            <section className={`${s.card} nv-rise`} style={rise(4)} aria-labelledby="ws-commits">
                                <p className="nv-eyebrow">Activity · {freshness}</p>
                                <h2 id="ws-commits" className="nv-display text-nv-title">
                                    Recent commits
                                </h2>
                                {commits.length === 0 ? (
                                    <p className="mt-4 text-nv-small text-nv-ivory-300">No recent commits were returned by GitHub.</p>
                                ) : (
                                    <ol className={s.timeline}>
                                        {commits.slice(0, 8).map((c) => (
                                            <li key={`${c.repo}-${c.sha}`}>
                                                <span aria-hidden className={s.timelineDot}>
                                                    <GitCommitHorizontal className="size-3.5" />
                                                </span>
                                                <p className="truncate text-nv-small font-medium text-nv-ivory-100">{c.message.split("\n")[0]}</p>
                                                <p className="nv-num truncate font-mono text-nv-micro text-nv-ivory-300">
                                                    {c.repo} · {c.sha.slice(0, 7)} · {fmtDate(c.date)}
                                                </p>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>
                        </div>

                        <section className={`${s.card} nv-rise`} style={rise(5)} aria-labelledby="ws-repos">
                            <p className="nv-eyebrow">Repositories</p>
                            <h2 id="ws-repos" className="nv-display text-nv-title">
                                Ranked by stars
                            </h2>
                            <div role="region" aria-label="Repository table" tabIndex={0} className={s.tableWrap}>
                                <table className={s.table}>
                                    <caption className="sr-only">Repositories with stars, forks and primary language</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Repository</th>
                                            <th scope="col">Language</th>
                                            <th scope="col" className={s.numCol}>
                                                Stars
                                            </th>
                                            <th scope="col" className={s.numCol}>
                                                Forks
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r) => (
                                            <tr key={r.repo} data-selected={selection?.kind === "repo" && selection.name === r.repo}>
                                                <th scope="row">
                                                    <button type="button" className={s.rowButton} onClick={() => setSelection({ kind: "repo", name: r.repo })} aria-label={`Focus ${r.repo} in the graph details`}>
                                                        {r.repo}
                                                    </button>
                                                </th>
                                                <td>
                                                    <span className="inline-flex items-center gap-2">
                                                        <span aria-hidden className={s.swatch} style={{ background: languageColor(r.language) }} />
                                                        {r.language ?? "None"}
                                                    </span>
                                                </td>
                                                <td className={`${s.numCol} nv-num`}>{num(r.stars)}</td>
                                                <td className={`${s.numCol} nv-num`}>{num(r.forks)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {byStars.length > 12 && (
                                <div className="mt-4">
                                    <Button variant="secondary" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                                        {showAll ? "Show fewer" : `Show all ${num(byStars.length)} repositories`}
                                    </Button>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            <div className={s.askDock}>
                <Button variant="primary" size="lg" onClick={onAsk} className="w-full" trailing={<ArrowRight className="size-4" aria-hidden />}>
                    Ask about @{profile.login}
                </Button>
            </div>
        </div>
    );
}
