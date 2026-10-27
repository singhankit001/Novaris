"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getRecentSearches } from "./actions";
import RepoSearch from "@/components/RepoSearch";
import { type PublicStatsData } from "@/components/PublicStats";
import { WhatsNewBadge } from "@/components/WhatsNewBadge";
import SiteChrome from "@/components/seo/SiteChrome";
import { Notice } from "@/components/nv/notice";
import { BasisTag } from "@/components/nv/badge";
import { Citation } from "@/components/nv/evidence";
import { cn } from "@/components/nv/cn";
import { FaqList, LinkRow, Rows, btnClass } from "@/components/seo/blocks";
import JsonLdScript from "@/components/JsonLdScript";
import Constellation from "@/components/landing/Constellation";
import StatStrip, { type ProductLimits } from "@/components/landing/StatStrip";
import FileStreams from "@/components/landing/FileStreams";
import PathChooser from "@/components/landing/PathChooser";
import DuskBand from "@/components/landing/DuskBand";
import ConnectGraph from "@/components/landing/ConnectGraph";
import Reveal from "@/components/landing/Reveal";
import DemoVideo from "@/components/media/DemoVideo";
import s from "@/components/landing/landing.module.css";
import { SECURITY_SCAN_FILE_LIMITS } from "@/lib/security-scan-config";
import type { SearchHistoryItem } from "@/lib/services/history-service";
import { INVALID_SESSION_ERROR_PARAM } from "@/lib/session-guard";
import { BlogPost } from "@prisma/client";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { FAQ_PAGE_ITEMS } from "@/lib/faq-data";
import { normalizeGitHubInput } from "@/lib/utils";
import { buildFaqStructuredData, buildSoftwareApplicationStructuredData } from "@/lib/structured-data";

const InstallPWA = dynamic(() => import("@/components/InstallPWA").then((mod) => mod.InstallPWA), { ssr: false });

const PORTAL_MS = 480;
// page.tsx passes the real values; this mirrors MAX_TOKENS (lib/tokens) for callers that render the client alone.
const FALLBACK_LIMITS: ProductLimits = { contextTokens: 200_000, deepScanFiles: SECURITY_SCAN_FILE_LIMITS.deep, quickScanFiles: SECURITY_SCAN_FILE_LIMITS.quick };
const FAQ_TEASER = FAQ_PAGE_ITEMS.slice(0, 5);

const FACTS: { term: string; detail: string }[] = [
    { term: "What it reads", detail: "Public GitHub data through the GitHub API: the file tree, the files chosen for your question, commit and language metadata." },
    { term: "What it sends to Gemini", detail: "Those selected files and your question, so the model can answer. Nothing else leaves GitHub's data." },
    { term: "Limits", detail: "Each question has a file budget. Deep security scans need sign-in. Reports are kept for 7 days." },
    { term: "What it does not do", detail: "No cloning or running code, no developer rankings or scores. Private repositories only with the access you grant." },
];

/** Small architecture diagram built from the same nodes the product draws. */
function MiniDiagram({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 320 200" className={className} role="presentation" focusable="false" aria-hidden="true">
            <defs>
                <linearGradient id="miniG" x1="0" x2="1">
                    <stop offset="0" stopColor="#2f54ff" />
                    <stop offset="1" stopColor="#7a4dff" />
                </linearGradient>
            </defs>
            <g fill="none" stroke="url(#miniG)" strokeWidth="1.4" opacity="0.7">
                <path d="M160 40 C160 70 70 70 70 104" />
                <path d="M160 40 C160 70 160 80 160 104" />
                <path d="M160 40 C160 70 250 70 250 104" />
                <path d="M70 134 C70 160 130 160 160 164" />
                <path d="M250 134 C250 160 190 160 160 164" />
            </g>
            {[
                [160, 26, "app/", true],
                [70, 118, "lib/", false],
                [160, 118, "components/", false],
                [250, 118, "api/", false],
                [160, 176, "prisma/", false],
            ].map(([x, y, label, on]) => (
                <g key={String(label)}>
                    <rect x={Number(x) - 36} y={Number(y) - 14} width="72" height="28" rx="9" fill="#fff" stroke={on ? "#2f54ff" : "#d5d8e0"} />
                    <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" fontFamily="var(--nv-font-mono)" fontSize="10" fill={on ? "#1f3ee6" : "#3a3e4a"}>
                        {String(label)}
                    </text>
                </g>
            ))}
        </svg>
    );
}

export default function HomeClient({
    initialPosts = [],
    weeklyTrending = [],
    monthlyTrending = [],
    publicStats,
    limits = FALLBACK_LIMITS,
}: {
    initialPosts?: BlogPost[];
    weeklyTrending?: CatalogRepoEntry[];
    monthlyTrending?: CatalogRepoEntry[];
    publicStats: PublicStatsData;
    limits?: ProductLimits;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [portal, setPortal] = useState<{ x: number; y: number } | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const reduce = useReducedMotion();
    const searchRef = useRef<HTMLDivElement>(null);
    const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
    const hasInvalidSessionError = searchParams.get("error") === INVALID_SESSION_ERROR_PARAM;

    const [trendingTier, setTrendingTier] = useState<"weekly" | "monthly">("weekly");
    const trendingRepos = trendingTier === "weekly" ? weeklyTrending : monthlyTrending;
    const visibleRepos = trendingRepos.slice(0, 6);
    const softwareSchema = buildSoftwareApplicationStructuredData({
        name: "Novaris",
        description:
            "Novaris helps developers analyze GitHub repositories for architecture understanding, AI code review, and security scanning.",
        path: "/",
        featureList: [
            "GitHub repository analysis",
            "Architecture mapping",
            "AI code review workflow",
            "Repository security scanning",
        ],
    });
    const faqSchema = buildFaqStructuredData(FAQ_TEASER);

    useEffect(() => {
        if (session) {
            getRecentSearches().then(setRecentSearches);
        }
    }, [session]);

    // Coming back via the browser cache must not leave the exit overlay on screen.
    useEffect(() => {
        const onShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                setPortal(null);
                setLoading(false);
            }
        };
        window.addEventListener("pageshow", onShow);
        return () => window.removeEventListener("pageshow", onShow);
    }, []);

    const handleSearch = async (query: string) => {
        const normalizedInput = normalizeGitHubInput(query);
        if (!normalizedInput) return;

        setLoading(true);
        setError("");

        try {
            const rect = searchRef.current?.getBoundingClientRect();
            setPortal({ x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2, y: rect ? rect.top + rect.height / 2 : window.innerHeight / 3 });
            await new Promise((resolve) => setTimeout(resolve, reduce ? 120 : PORTAL_MS));
            router.push(`/chat?q=${encodeURIComponent(normalizedInput)}`);
        } catch {
            setPortal(null);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const focusSearch = () => {
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        window.setTimeout(() => document.getElementById("hero-search")?.focus(), reduce ? 0 : 450);
    };

    return (
        <SiteChrome overlayHeader>
            <motion.div animate={portal ? { scale: reduce ? 1 : 0.985, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ duration: PORTAL_MS / 1000, ease: [0.23, 1, 0.32, 1] }}>
                {/* ---------- Hero ---------- */}
                <section aria-labelledby="home-h" className={s.hero}>
                    <div aria-hidden className={cn(s.heroBg, "nv-aurora")}>
                        <div className={cn(s.heroGrid, "nv-grid-paper")} />
                    </div>
                    <div className={s.wrap}>
                        <div className={s.pillTop}>
                            <span>Public repositories and profiles</span>
                            <WhatsNewBadge />
                        </div>
                        <h1 id="home-h" className={cn(s.heroTitle, "nv-display")}>
                            Read a repository. See the <em>files</em> behind every answer.
                        </h1>
                        <p className={s.heroLead}>
                            Paste a GitHub URL, a username, or owner/repo. Novaris loads the relevant files and answers questions about architecture, code, and security, with the sources shown.
                        </p>

                        {hasInvalidSessionError && (
                            <Notice tone="warning" title="Your session could not be validated" className="mx-auto mt-6 max-w-xl text-left">
                                Sign in again to continue.
                            </Notice>
                        )}

                        <div ref={searchRef} className={s.searchWrap}>
                            <RepoSearch
                                onSearchSubmit={handleSearch}
                                loading={loading}
                                trendingRepos={weeklyTrending}
                                recentSearches={recentSearches}
                                isSessionActive={!!session}
                                activating={portal !== null}
                                inputId="hero-search"
                            />
                            {error && (
                                <p role="alert" className="mt-3 text-center text-nv-small text-nv-danger">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className={s.stage}>
                        <Constellation />
                        <div aria-hidden className={s.stageFade} />
                    </div>
                    <p className={s.cCaption}>
                        <span className="nv-eyebrow mr-2">Illustrative</span>
                        Modules and files converge on one answer. In a real result each line links to a file and line range.
                    </p>
                </section>

                <div className={s.wrap}>
                    <StatStrip stats={publicStats} limits={limits} />
                </div>

                {/* ---------- Signal burst ---------- */}
                <section aria-labelledby="burst-h" className={s.burst}>
                    <div aria-hidden className={s.burstGlow} />
                    <div className={cn(s.wrap, s.burstHead, s.center)}>
                        <Reveal>
                            <p className={s.kicker}>Many files in, one answer out</p>
                            <h2 id="burst-h" className={cn(s.h2, "nv-display")}>
                                Hundreds of files, one <em>cited</em> answer.
                            </h2>
                            <p className={s.sub}>
                                A repository is a lot of files. Novaris narrows them to the ones your question needs and brings them together in a single answer that points back at each source.
                            </p>
                        </Reveal>
                    </div>
                    <FileStreams />
                </section>

                {/* ---------- How it works ---------- */}
                <section aria-labelledby="how-h" className={s.section}>
                    <div className={s.wrap}>
                        <Reveal>
                            <p className={s.kicker}>How it works</p>
                            <h2 id="how-h" className={cn(s.h2, "nv-display")}>
                                From a URL to a <em>sourced</em> answer in three steps.
                            </h2>
                        </Reveal>
                        <ol className={s.steps}>
                            <li className={s.step}>
                                <span aria-hidden className={s.stepNum}>01</span>
                                <div>
                                    <h3 className={s.stepTitle}>Point it at a repository or a person.</h3>
                                    <p className={s.stepText}>A GitHub URL, owner/repo, or a username. Public data only, unless you grant access.</p>
                                </div>
                                <div className={s.frag} aria-hidden>
                                    <div className="relative">
                                        <div className="invisible">
                                            <div className={cn(s.fragRow, s.fragOn)}>vercel/next.js</div>
                                            <div className={cn(s.fragLine, "w-[70%]")} />
                                            <div className={cn(s.fragLine, "w-[46%]")} />
                                        </div>
                                        <DemoVideo name="select" fill className="-inset-[18px] rounded-[19px] bg-white" />
                                    </div>
                                </div>
                            </li>
                            <li className={s.step}>
                                <span aria-hidden className={s.stepNum}>02</span>
                                <div>
                                    <h3 className={s.stepTitle}>It reads the files that matter.</h3>
                                    <p className={s.stepText}>Novaris reads the file tree, then loads complete files chosen for your question instead of fragments.</p>
                                </div>
                                <div className={s.frag} aria-hidden>
                                    <div className="relative">
                                        <div className="invisible">
                                            <div className={cn(s.fragRow, s.fragDim)}>README.md</div>
                                            <div className={cn(s.fragRow, s.fragOn)}>src/lib/auth.ts</div>
                                            <div className={cn(s.fragRow, s.fragOn)}>src/middleware.ts</div>
                                            <div className={cn(s.fragRow, s.fragDim)}>package.json</div>
                                        </div>
                                        <DemoVideo name="repo-analysis" fill className="-inset-[18px] rounded-[19px] bg-white" />
                                    </div>
                                </div>
                            </li>
                            <li className={s.step}>
                                <span aria-hidden className={s.stepNum}>03</span>
                                <div>
                                    <h3 className={s.stepTitle}>You get an answer with its sources.</h3>
                                    <p className={s.stepText}>Claims link a file or are labelled inferred. Anything the data does not show is stated as unknown.</p>
                                </div>
                                <div className={s.frag}>
                                    <p className="m-0 font-sans text-nv-body text-nv-ivory-100">Requests pass through a single auth middleware.</p>
                                    <div className={s.fragBadgeRow}>
                                        <BasisTag basis="measured" />
                                        <Citation kind="file" target="src/middleware.ts" lines="12-40" />
                                    </div>
                                </div>
                            </li>
                        </ol>
                    </div>
                </section>

                {/* ---------- Product window ---------- */}
                <section aria-labelledby="window-h" className={cn(s.section, "!pt-0")}>
                    <div className={s.wrap}>
                        <Reveal>
                            <div className={s.center}>
                                <p className={s.kicker}>Inside the workspace</p>
                                <h2 id="window-h" className={cn(s.h2, "nv-display")}>
                                    Ask. Read. <em>Verify.</em>
                                </h2>
                                <p className={s.sub}>A sample layout of the workspace, with made-up values rather than a real result.</p>
                            </div>
                        </Reveal>
                        <Reveal delay={0.08}>
                            <div className={cn(s.window, "mt-14")} role="group" aria-label="Sample analysis workspace">
                                <div className={s.winBar} aria-hidden>
                                    <span className={s.winDot} />
                                    <span className={s.winDot} />
                                    <span className={s.winDot} />
                                    <span className={s.winTitle}>novaris / owner-repo</span>
                                </div>
                                <div className={s.winBody}>
                                    <div className={s.winCol}>
                                        <p className={s.winCap}>Files in context</p>
                                        <ul className={s.mini}>
                                            <li className={s.miniItem}>src/</li>
                                            <li className={cn(s.miniItem, s.indent1)}>middleware.ts</li>
                                            <li className={cn(s.miniItem, s.miniOn, s.indent1)}>lib/auth.ts</li>
                                            <li className={cn(s.miniItem, s.indent1)}>lib/http.ts</li>
                                            <li className={s.miniItem}>prisma/</li>
                                            <li className={cn(s.miniItem, s.indent1)}>schema.prisma</li>
                                        </ul>
                                    </div>
                                    <div className={s.winCol}>
                                        <p className={s.winCap}>Conversation</p>
                                        <div className="relative">
                                            <div className="invisible">
                                                <p className={s.bubbleQ}>How is authentication enforced?</p>
                                                <div className={s.answer}>
                                                    <div className={s.claim}>
                                                        <p className={s.claimText}>Requests pass through a single auth middleware before reaching route handlers.</p>
                                                        <div className={s.claimMeta}>
                                                            <BasisTag basis="measured" />
                                                            <Citation kind="file" target="src/middleware.ts" lines="12-40" />
                                                        </div>
                                                    </div>
                                                    <div className={s.claim}>
                                                        <p className={s.claimText}>The retry policy probably protects against rate limits.</p>
                                                        <div className={s.claimMeta}>
                                                            <BasisTag basis="inferred" />
                                                            <Citation kind="file" target="src/lib/http.ts" lines="55-71" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <DemoVideo name="ai-chat" fill tagCorner="top-left" label="Illustrative chat: a question, files read, and an answer with cited sources" className="hidden min-[1100px]:block rounded-2xl border border-nv-graphite-700 bg-white" />
                                            <DemoVideo name="ai-chat-narrow" fill tagCorner="top-left" label="Illustrative chat: a question, files read, and an answer with cited sources" className="min-[1100px]:hidden rounded-2xl border border-nv-graphite-700 bg-white" />
                                        </div>
                                    </div>
                                    <div className={s.winCol}>
                                        <p className={s.winCap}>Architecture</p>
                                        <DemoVideo name="architecture" label="Illustrative architecture map: modules appear and connect" className="rounded-xl border border-nv-graphite-700 bg-white" />
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ---------- Capabilities ---------- */}
                <section aria-labelledby="caps-h" className={cn(s.section, "!pt-0")}>
                    <div className={s.wrap}>
                        <Reveal>
                            <p className={s.kicker}>Capabilities</p>
                            <h2 id="caps-h" className={cn(s.h2, "nv-display")}>
                                One workspace for <em>three</em> kinds of questions.
                            </h2>
                        </Reveal>
                        <div className={cn(s.caps, "mt-14")}>
                            <Link href="/github-repository-analysis" className={cn(s.cap, s.capBig)}>
                                <div aria-hidden className={cn(s.capGlow, "nv-aurora")} />
                                <div>
                                    <span className={s.capTag}>Architecture</span>
                                    <h3 className={s.capTitle}>Understand a codebase before you touch it.</h3>
                                    <p className={s.capText}>Module boundaries, dependencies and entry points, drawn from whole files and linked to the code.</p>
                                </div>
                                <MiniDiagram className="mx-auto w-full max-w-sm" />
                                <span className={s.capLink}>
                                    Repository analysis <ArrowUpRight aria-hidden className="size-4" />
                                </span>
                            </Link>
                            <Link href="/ai-code-review-tool" className={s.cap}>
                                <div>
                                    <span className={s.capTag}>Review</span>
                                    <h3 className={s.capTitle}>Code review with the context around the diff.</h3>
                                    <p className={s.capText}>Imports and callers sit next to the code, so review notes point at real file paths.</p>
                                </div>
                                <span className={s.capLink}>
                                    AI code review <ArrowUpRight aria-hidden className="size-4" />
                                </span>
                            </Link>
                            <Link href="/security-scanner" className={s.cap}>
                                <div>
                                    <span className={s.capTag}>Security</span>
                                    <h3 className={s.capTitle}>Findings with a file, a line and a reason.</h3>
                                    <p className={s.capText}>Quick scans for everyone, deep scans when signed in. Every finding is something to verify.</p>
                                </div>
                                <span className={s.capLink}>
                                    Security scanner <ArrowUpRight aria-hidden className="size-4" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ---------- Choose a path ---------- */}
                <section aria-labelledby="path-h" className={cn(s.section, "!pt-0")}>
                    <div className={s.wrap}>
                        <Reveal className={s.gapBelow}>
                            <p className={s.kicker}>Get started</p>
                            <h2 id="path-h" className={cn(s.h2, "nv-display")}>
                                Choose an analysis <em>path.</em>
                            </h2>
                        </Reveal>
                        <PathChooser />
                    </div>
                </section>

                <div className={s.wrap}>
                    <DuskBand limits={limits} />
                </div>

                {/* ---------- Connect ---------- */}
                <section aria-labelledby="connect-h" className={s.section}>
                    <div className={s.wrap}>
                        <Reveal>
                            <div className={s.center}>
                                <p className={s.kicker}>What it connects to</p>
                                <h2 id="connect-h" className={cn(s.h2, "nv-display")}>
                                    Built on the data <em>GitHub</em> already holds.
                                </h2>
                                <p className={s.sub}>Novaris reads repositories, files and commits through the GitHub API, then brings them into chat and the security scanner.</p>
                            </div>
                        </Reveal>
                        <div className="mt-14">
                            <ConnectGraph />
                        </div>
                    </div>
                </section>

                {/* ---------- Facts ---------- */}
                <section aria-labelledby="facts-h" className={cn(s.sectionTight, "!pt-0")}>
                    <div className={cn(s.wrap, s.split)}>
                        <Reveal>
                            <p className={s.kicker}>Privacy and limits</p>
                            <h2 id="facts-h" className={cn(s.h2, "nv-display")}>
                                What happens to your <em>request.</em>
                            </h2>
                        </Reveal>
                        <dl className={s.facts}>
                            {FACTS.map((f) => (
                                <div key={f.term} className={s.fact}>
                                    <dt>{f.term}</dt>
                                    <dd>{f.detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {trendingRepos.length > 0 && (
                    <section id="trending-section" aria-labelledby="trend-h" className={s.sectionTight}>
                        <div className={cn(s.wrap, s.split)}>
                            <div>
                                <p className={s.kicker}>Catalog</p>
                                <h2 id="trend-h" className={cn(s.h2, "nv-display")}>
                                    Trending in the <em>catalog</em>
                                </h2>
                                <div role="group" aria-label="Time window" className={s.seg}>
                                    {(["weekly", "monthly"] as const).map((tier) => (
                                        <button key={tier} type="button" aria-pressed={trendingTier === tier} onClick={() => setTrendingTier(tier)} className={s.segBtn}>
                                            {tier}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Rows>
                                    {visibleRepos.map((repo) => (
                                        <LinkRow
                                            key={`${repo.owner}/${repo.repo}`}
                                            href={`/chat?q=${encodeURIComponent(`${repo.owner}/${repo.repo}`)}`}
                                            title={`${repo.owner}/${repo.repo}`}
                                            summary={repo.description || "No description in the catalog."}
                                            meta={`${repo.stars.toLocaleString()} stars`}
                                        />
                                    ))}
                                </Rows>
                                <Link href="/trending" className="mt-5 inline-flex min-h-11 items-center gap-1 font-medium text-nv-copper-400 hover:text-nv-copper-300">
                                    All trending repositories <ArrowUpRight aria-hidden className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {initialPosts.length > 0 && (
                    <section aria-labelledby="posts-h" className={s.sectionTight}>
                        <div className={cn(s.wrap, s.split)}>
                            <div>
                                <p className={s.kicker}>Insights</p>
                                <h2 id="posts-h" className={cn(s.h2, "nv-display")}>
                                    Latest <em>insights</em>
                                </h2>
                            </div>
                            <div>
                                <Rows>
                                    {initialPosts.map((post) => (
                                        <LinkRow key={post.slug} href={`/blog/${post.slug}`} title={post.title} meta={`${post.date} · ${post.category}`} />
                                    ))}
                                </Rows>
                                <Link href="/blog" className="mt-5 inline-flex min-h-11 items-center gap-1 font-medium text-nv-copper-400 hover:text-nv-copper-300">
                                    All insights <ArrowUpRight aria-hidden className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* ---------- FAQ teaser ---------- */}
                <section aria-labelledby="faq-h" className={s.sectionTight}>
                    <div className={cn(s.wrap, s.split)}>
                        <div>
                            <p className={s.kicker}>FAQ</p>
                            <h2 id="faq-h" className={cn(s.h2, "nv-display")}>
                                Questions, <em>answered.</em>
                            </h2>
                            <Link href="/faq" className="mt-6 inline-flex min-h-11 items-center gap-1 font-medium text-nv-copper-400 hover:text-nv-copper-300">
                                Read every answer <ArrowUpRight aria-hidden className="size-4" />
                            </Link>
                        </div>
                        <FaqList items={FAQ_TEASER} />
                    </div>
                </section>

                {/* ---------- Closing CTA ---------- */}
                <section aria-labelledby="close-h" className={cn(s.sectionTight, "!pb-24")}>
                    <div className={s.wrap}>
                        <div className={s.closer}>
                            <div aria-hidden className={cn(s.closerGlow, "nv-aurora")} />
                            <h2 id="close-h" className={cn(s.closerH, "nv-display")}>
                                Open a repository. <em>Read it.</em>
                            </h2>
                            <p className={s.closerText}>No install and no clone. Paste a link and see which files back each answer.</p>
                            <div className={s.closerActions}>
                                <button type="button" onClick={focusSearch} className={btnClass("primary", true)}>
                                    Start analyzing <ArrowRight aria-hidden className="size-4" />
                                </button>
                                <Link href="/trending" className={btnClass("secondary", true)}>
                                    Browse trending
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </motion.div>

            <AnimatePresence>
                {portal && (
                    <div
                        key="portal"
                        aria-hidden
                        className={s.portal}
                        style={{ "--px": `${portal.x}px`, "--py": `${portal.y}px` } as React.CSSProperties}
                    >
                        <motion.div className={s.portalWash} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: PORTAL_MS / 1000, ease: [0.23, 1, 0.32, 1] }} />
                        <motion.div className={s.portalRing} initial={{ scale: 0.02, opacity: 1 }} animate={{ scale: 1, opacity: 0.9 }} transition={{ duration: PORTAL_MS / 1000, ease: [0.23, 1, 0.32, 1] }} />
                    </div>
                )}
            </AnimatePresence>
            <JsonLdScript data={softwareSchema} />
            <JsonLdScript data={faqSchema} />
            <InstallPWA />
        </SiteChrome>
    );
}
