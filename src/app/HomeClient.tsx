"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Star, GitFork, MessageSquare, Globe, TrendingUp } from "lucide-react";
import { getRecentSearches } from "./actions";
import TrustedByMarquee from "@/components/TrustedByMarquee";
import { GitHubBadge } from "@/components/GitHubBadge";
import { CAGBadge } from "@/components/CAGBadge";
import { WhatsNewBadge } from "@/components/WhatsNewBadge";
import Image from "next/image";
import PublicStats from "@/components/PublicStats";
import AuthButton from "@/components/AuthButton";
import { Interactive3DCard } from "@/components/Interactive3DCard";
import dynamic from "next/dynamic";

const InteractiveDemo = dynamic(() => import("@/components/InteractiveDemo"), { ssr: true });
const BentoFeatures = dynamic(() => import("@/components/BentoFeatures"), { ssr: true });
const CAGComparison = dynamic(() => import("@/components/CAGComparison"), { ssr: true });
const InstallPWA = dynamic(() => import("@/components/InstallPWA").then((mod) => mod.InstallPWA), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
const FeaturedIn = dynamic(() => import("@/components/FeaturedIn"), { ssr: true });
const MediaShowcase = dynamic(() => import("@/components/MediaShowcase"), { ssr: true });
const SecurityBanner = dynamic(() => import("@/components/SecurityBanner"), { ssr: true });
import JsonLdScript from "@/components/JsonLdScript";
import type { SearchHistoryItem } from "@/lib/services/history-service";
import { INVALID_SESSION_ERROR_PARAM } from "@/lib/session-guard";
import { BlogPost } from "@prisma/client";
import { CatalogRepoEntry } from "@/lib/repo-catalog";
import { FAQ_PAGE_ITEMS } from "@/lib/faq-data";
import { normalizeGitHubInput } from "@/lib/utils";
import RepoSearch from "@/components/RepoSearch";
import { buildFaqStructuredData, buildSoftwareApplicationStructuredData } from "@/lib/structured-data";

type PublicStatsData = {
    totalVisitors: number;
    totalQueries: number;
    totalScans: number;
};

export default function HomeClient({
    initialPosts = [],
    weeklyTrending = [],
    monthlyTrending = [],
    publicStats,
}: {
    initialPosts?: BlogPost[];
    weeklyTrending?: CatalogRepoEntry[];
    monthlyTrending?: CatalogRepoEntry[];
    publicStats: PublicStatsData;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
    const [visibleReposCount, setVisibleReposCount] = useState(6);
    const hasInvalidSessionError = searchParams.get("error") === INVALID_SESSION_ERROR_PARAM;

    const [trendingTier, setTrendingTier] = useState<"weekly" | "monthly">("weekly");
    const trendingRepos = trendingTier === "weekly" ? weeklyTrending : monthlyTrending;
    const visibleRepos = trendingRepos.slice(0, visibleReposCount);
    const hasMoreRepos = visibleReposCount < trendingRepos.length;
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
    const faqSchema = buildFaqStructuredData(FAQ_PAGE_ITEMS);

    useEffect(() => {
        if (session) {
            getRecentSearches().then(setRecentSearches);
        }
    }, [session]);

    const handleSearch = async (query: string) => {
        const normalizedInput = normalizeGitHubInput(query);
        if (!normalizedInput) return;

        setLoading(true);
        setError("");

        try {
            router.push(`/chat?q=${encodeURIComponent(normalizedInput)}`);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <main className="flex flex-col bg-transparent text-white overflow-x-hidden relative min-h-screen noise-bg">
            {/* Premium background grid and glowing lights */}
            <div className="absolute inset-0 premium-grid opacity-15 pointer-events-none z-0" />
            <div className="absolute inset-0 premium-radial pointer-events-none z-0" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-950/10 rounded-full blur-[140px] pointer-events-none z-0 animate-mesh-1" />
            <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-blue-950/10 rounded-full blur-[160px] pointer-events-none z-0 animate-mesh-2" />

            {/* Sticky Glass Navbar */}
            <header className="sticky top-0 z-[100] w-full border-b border-white/10 bg-[#030303]/85 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-all">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <span className="font-display font-extrabold text-xl tracking-[0.25em] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-zinc-100 to-purple-500 hover:opacity-90 transition-opacity">
                                NOVARIS
                            </span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-4 text-xs font-semibold tracking-wider uppercase text-zinc-200">
                            <Link href="/solutions" className="hover:text-cyan-400 hover:bg-white/5 transition-all px-3 py-1.5 rounded-lg">
                                Solutions
                            </Link>
                            <Link href="/compare" className="hover:text-cyan-400 hover:bg-white/5 transition-all px-3 py-1.5 rounded-lg">
                                Compare
                            </Link>
                            <Link href="/blog" className="hover:text-cyan-400 hover:bg-white/5 transition-all px-3 py-1.5 rounded-lg">
                                Insights
                            </Link>
                            <Link href="/faq" className="hover:text-cyan-400 hover:bg-white/5 transition-all px-3 py-1.5 rounded-lg">
                                FAQ
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <GitHubBadge />
                        <AuthButton />
                    </div>
                </div>
            </header>

            <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16 sm:py-20 md:py-24 relative overflow-hidden z-10">
                {/* Animated connection web background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <motion.circle cx="15%" cy="20%" r="4" fill="#a855f7" opacity="0.6" animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} />
                        <motion.circle cx="85%" cy="30%" r="6" fill="#3b82f6" opacity="0.4" animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }} />
                        <motion.circle cx="70%" cy="80%" r="5" fill="#10b981" opacity="0.5" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }} />
                        <motion.circle cx="25%" cy="75%" r="5" fill="#eab308" opacity="0.4" animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 3 }} />
                        <path d="M 15% 20% L 25% 75%" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="5,5" />
                        <path d="M 85% 30% L 70% 80%" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="5,5" />
                        <path d="M 15% 20% L 85% 30%" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1.5" />
                    </svg>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="z-10 flex flex-col items-center text-center max-w-4xl w-full px-4 gap-4 md:gap-5"
                >
                    <div className="w-full flex flex-col items-center gap-3 md:gap-4">
                        <div className="conic-border-container neon-spin-ring rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                            <Image
                                src="/1080x1080.png"
                                alt="Novaris Logo"
                                width={96}
                                height={96}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                        <div className="inline-flex items-center justify-center gap-2 md:gap-3 w-full">
                            <p className="whitespace-nowrap text-xs md:text-sm font-extrabold tracking-[0.4em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 leading-none">
                                NOVARIS
                            </p>
                            <WhatsNewBadge />
                        </div>
                    </div>

                    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-100 to-zinc-300 relative leading-tight max-w-5xl text-balance animate-fade-in-up-blur drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                        GitHub Repository Analysis, Code Review & Security Scanning
                    </h1>

                    <CAGBadge />

                    <p className="text-base sm:text-lg md:text-xl text-zinc-200 mb-4 max-w-3xl mx-auto leading-relaxed animate-fade-in-up-blur [animation-delay:200ms] font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                        Understand repositories faster with context-aware AI. Go from URL to architecture, code review, and security triage.
                    </p>

                    {hasInvalidSessionError && (
                        <div className="w-full max-w-md mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
                            Your session could not be validated. Please sign in again.
                        </div>
                    )}

                    <Interactive3DCard className="w-full max-w-4xl p-2" glowColor="cyan">
                        <RepoSearch 
                            onSearchSubmit={handleSearch}
                            loading={loading}
                            trendingRepos={weeklyTrending}
                            recentSearches={recentSearches}
                            isSessionActive={!!session}
                        />
                    </Interactive3DCard>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-5 text-red-400 text-sm"
                        >
                            {error}
                        </motion.p>
                    )}

                    <PublicStats stats={publicStats} />
                </motion.div>
            </section>

            <FeaturedIn />
            <TrustedByMarquee trendingRepos={weeklyTrending} />
            <InteractiveDemo />

            <div className="relative z-10 w-full bg-transparent">
                <BentoFeatures />
                <SecurityBanner />
            </div>

            <section className="relative z-10 w-full bg-transparent py-24 px-6 border-t border-white/10 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 gap-10 items-start">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">Use Cases That Drive Decisions</h2>
                            <p className="text-zinc-200 text-lg mb-8">
                                Novaris helps teams reduce uncertainty before adoption, release, and remediation decisions.
                            </p>
                            <div className="space-y-4">
                                <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 group hover:border-zinc-700 transition-colors">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-cyan-400 transition-colors">Repository Due Diligence</h3>
                                    <p className="text-zinc-200 text-sm mb-4">Evaluate unfamiliar repositories before adopting dependencies or onboarding teams. Get system-level snapshots for immediate clarity.</p>
                                    <Link href="/github-repository-analysis" className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition-colors flex items-center gap-1">
                                        Exploration Workflow <ArrowRight size={12} />
                                    </Link>
                                </article>
                                <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 group hover:border-zinc-700 transition-colors">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-400 transition-colors">Context-Aware Code Review</h3>
                                    <p className="text-zinc-200 text-sm mb-4">Review implementation quality with repository context, not isolated snippets. Surface logic flaws and blind spots.</p>
                                    <Link href="/ai-code-review-tool" className="text-purple-400 text-xs font-bold hover:text-purple-300 transition-colors flex items-center gap-1">
                                        Review Workflow <ArrowRight size={12} />
                                    </Link>
                                </article>
                                <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 group hover:border-zinc-700 transition-colors">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-red-400 transition-colors">Security Prioritization</h3>
                                    <p className="text-zinc-200 text-sm mb-4">Surface actionable risk signals and triage findings with engineering context. Get severity-framed remediation direction.</p>
                                    <Link href="/security-scanner" className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors flex items-center gap-1">
                                        Triage Workflow <ArrowRight size={12} />
                                    </Link>
                                </article>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative z-10 w-full bg-transparent py-24 px-6 border-t border-white/10 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-cyan-100 to-zinc-400 bg-clip-text text-transparent">How Novaris Works</h2>
                        <p className="text-zinc-200 text-lg max-w-3xl mx-auto">
                            Intent-first workflows for repository analysis, architecture clarity, code review, and security prioritization.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <article className="rounded-2xl border border-white/10 bg-[#09090b]/40 backdrop-blur-xl p-6 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300">
                            <h3 className="font-semibold mb-2 text-white">1. Start with a URL</h3>
                            <p className="text-zinc-200 text-sm">Paste a GitHub repository URL and select your goal.</p>
                        </article>
                        <article className="rounded-2xl border border-white/10 bg-[#09090b]/40 backdrop-blur-xl p-6 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300">
                            <h3 className="font-semibold mb-2 text-white">2. Build context</h3>
                            <p className="text-zinc-200 text-sm">Agentic CAG gathers full-file context needed for reliable understanding.</p>
                        </article>
                        <article className="rounded-2xl border border-white/10 bg-[#09090b]/40 backdrop-blur-xl p-6 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300">
                            <h3 className="font-semibold mb-2 text-white">3. Analyze deeply</h3>
                            <p className="text-zinc-200 text-sm">Map architecture, review implementation, and identify risk hotspots.</p>
                        </article>
                        <article className="rounded-2xl border border-white/10 bg-[#09090b]/40 backdrop-blur-xl p-6 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300">
                            <h3 className="font-semibold mb-2 text-white">4. Take action</h3>
                            <p className="text-zinc-200 text-sm">Get outputs you can use immediately in engineering and security workflows.</p>
                        </article>
                    </div>
                </div>
            </section>

            <MediaShowcase />

            <div className="relative z-10 w-full bg-transparent">
                <CAGComparison />
            </div>



            <section className="relative z-10 w-full bg-transparent py-24 px-6 border-t border-white/10 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-10">Frequently Asked Questions</h2>
                    <div className="space-y-5">
                        {FAQ_PAGE_ITEMS.map((item, index) => (
                            <article
                                key={item.question}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900/40"
                            >
                                <button
                                    type="button"
                                    aria-expanded={activeFaqIndex === index}
                                    aria-controls={`homepage-faq-answer-${index}`}
                                    onClick={() => setActiveFaqIndex((current) => (current === index ? null : index))}
                                    className="flex w-full items-center justify-between gap-4 p-6 text-left"
                                >
                                    <h3 className="text-xl font-semibold text-white">{item.question}</h3>
                                    <ChevronDown
                                        className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${
                                            activeFaqIndex === index ? "rotate-180 text-white" : ""
                                        }`}
                                    />
                                </button>
                                <motion.div
                                    id={`homepage-faq-answer-${index}`}
                                    aria-hidden={activeFaqIndex !== index}
                                    initial={false}
                                    animate={
                                        activeFaqIndex === index
                                            ? { height: "auto", opacity: 1 }
                                            : { height: 0, opacity: 0 }
                                    }
                                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden will-change-[height,opacity]"
                                >
                                    <div className="px-6 pb-6">
                                        <p className="text-zinc-200 leading-relaxed">{item.answer}</p>
                                    </div>
                                </motion.div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>


            {trendingRepos.length > 0 && (
                <section id="trending-section" className="relative z-10 w-full bg-transparent py-24 px-6 border-t border-white/10 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-12 text-center">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
                                <TrendingUp className="inline-block text-cyan-400 mb-1 mr-2 md:mr-3" size={32} />
                                Explore Trending <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Repositories</span>
                            </h2>
                            <p className="text-zinc-200 text-lg max-w-2xl mx-auto mb-8">
                                Explore the projects getting the most heat on GitHub. Instantly analyze any of them with Novaris.
                            </p>

                            <div className="flex justify-center p-1 bg-zinc-900/60 border border-white/10 rounded-xl w-fit mx-auto backdrop-blur-md">
                                <button
                                    onClick={() => { setTrendingTier("weekly"); setVisibleReposCount(6); }}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                                        trendingTier === "weekly" 
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                                        : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => { setTrendingTier("monthly"); setVisibleReposCount(6); }}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                                        trendingTier === "monthly" 
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                                        : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleRepos.map((repo) => (
                                <div 
                                    key={`${repo.owner}/${repo.repo}`}
                                    className="bg-[#09090b]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 hover:shadow-[0_0_35px_rgba(6,182,212,0.18)] transition-all duration-300 group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-zinc-300 font-medium">
                                                <Image 
                                                    src={`https://github.com/${repo.owner}.png`}
                                                    alt={`${repo.owner} avatar`}
                                                    width={20}
                                                    height={20}
                                                    className="rounded-full bg-white/10"
                                                />
                                                <span className="truncate max-w-[150px]">{repo.owner}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-zinc-300 uppercase">
                                                <Globe size={10} /> {repo.language || 'Code'}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                            {repo.repo}
                                        </h3>
                                        <p className="text-zinc-300 text-sm line-clamp-2 mb-6 min-h-[40px]">
                                            {repo.description || 'Experience high-context AI analysis for this repository.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-4 text-xs text-zinc-300">
                                            <span className="flex items-center gap-1">
                                                <Star size={12} className="text-yellow-500" />
                                                {repo.stars.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <GitFork size={12} className="text-zinc-600" />
                                                Trending
                                            </span>
                                        </div>
                                        <Link 
                                            href={`/chat?q=${repo.owner}/${repo.repo}`}
                                            aria-label={`Analyze ${repo.owner}/${repo.repo} with Novaris`}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                                        >
                                            <MessageSquare size={12} />
                                            Analyze
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {hasMoreRepos ? (
                            <div className="mt-12 flex flex-col items-center gap-8">
                                <button 
                                    onClick={() => setVisibleReposCount(prev => prev + 6)}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors group"
                                >
                                    Show more repositories
                                    <TrendingUp size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                                <Link 
                                    href="/trending"
                                    className="text-zinc-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 group"
                                >
                                    Explore all trending repositories
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-12 text-center">
                                <Link 
                                    href="/trending"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-zinc-900 border border-white/10 text-white font-bold hover:bg-zinc-800 transition-colors group"
                                >
                                    Explore all trending repositories
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {initialPosts.length > 0 && (
                <section className="relative z-10 w-full bg-transparent py-24 px-6 border-t border-white/10 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col items-center text-center mb-12 gap-6">
                            <div>
                                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                    Engineering <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Insights</span>
                                </h2>
                                <p className="text-zinc-200 text-lg max-w-2xl mx-auto">
                                    Latest updates from the lab on AI-driven code intelligence and security.
                                </p>
                            </div>
                            <Link 
                                href="/blog" 
                                className="inline-flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors group px-4 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10"
                            >
                                View all insights <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {initialPosts.map((post) => (
                                <Link 
                                    key={post.slug} 
                                    href={`/blog/${post.slug}`}
                                    className="group flex flex-col h-full bg-[#09090b]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:border-purple-500/40 hover:shadow-[0_0_35px_rgba(168,85,247,0.18)] transition-all duration-300"
                                >
                                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-5 border border-white/5">
                                        <Image 
                                            src={post.image} 
                                            alt={post.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20 uppercase">
                                            {post.category}
                                        </span>
                                        <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-tighter">
                                            {post.date}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <p className="text-zinc-200 text-sm italic opacity-80 line-clamp-2 mb-6">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-300">Read insight</span>
                                        <ArrowRight size={14} className="text-zinc-300 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <Footer />
            <JsonLdScript data={softwareSchema} />
            <JsonLdScript data={faqSchema} />
            <InstallPWA />
        </main>
    );
}
