"use client";

import { useState, useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const ProfileChatInterface = dynamic(() => import("./ProfileChatInterface").then((mod) => mod.ProfileChatInterface), {
    ssr: false,
});
import { fetchProfile, fetchProfileReadme, fetchRecentProfileCommitSnapshot, fetchUserRepos } from "@/app/actions";
import type { GitHubProfile } from "@/lib/github";
import { JourneyStage } from "@/components/journey/JourneyStage";
import { ProfileWorkspace } from "@/components/journey/ProfileWorkspace";
import {
    PROFILE_STAGE_LABELS,
    buildProfileScene,
    classifyFailure,
    initialStages,
    stagesReducer,
    summarizeLanguages,
    type JourneyFailure,
    type ProfileFacts,
    type SceneModel,
    type StageEvent,
} from "@/components/journey/model";

interface ProfileLoaderProps {
    username: string;
}

interface ProfileLoaderData {
    profile: GitHubProfile;
    profileReadme: string | null;
    repoReadmes: {
        repo: string;
        content: string;
        updated_at: string;
        description: string | null;
        stars: number;
        forks: number;
        language: string | null;
    }[];
    recentCommits: {
        repo: string;
        message: string;
        date: string | null;
        sha: string;
    }[];
    recentCommitFreshnessLabel: string;
}

const PROFILE_LOADER_CACHE_TTL_MS = 15 * 60 * 1000;
const COMMITS_SOFT_TIMEOUT_MS = 12_000;

function getProfileLoaderCacheKey(username: string): string {
    return `novaris_profile_loader:${username.toLowerCase()}`;
}

function readCachedProfileLoaderData(username: string): ProfileLoaderData | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(getProfileLoaderCacheKey(username));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { timestamp?: number; data?: ProfileLoaderData };
        if (!parsed?.timestamp || !parsed?.data) return null;
        if (Date.now() - parsed.timestamp > PROFILE_LOADER_CACHE_TTL_MS) {
            window.sessionStorage.removeItem(getProfileLoaderCacheKey(username));
            return null;
        }
        return {
            ...parsed.data,
            recentCommits: Array.isArray(parsed.data.recentCommits) ? parsed.data.recentCommits : [],
            recentCommitFreshnessLabel:
                typeof parsed.data.recentCommitFreshnessLabel === "string"
                    ? parsed.data.recentCommitFreshnessLabel
                    : "just now",
        };
    } catch {
        return null;
    }
}

function writeCachedProfileLoaderData(username: string, data: ProfileLoaderData): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(
            getProfileLoaderCacheKey(username),
            JSON.stringify({ timestamp: Date.now(), data })
        );
    } catch {
        // Ignore storage errors to keep loading resilient.
    }
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
        return (error as { message: string }).message;
    }
    return "Failed to load profile";
}

/** Facts for a stage that completed from stored data rather than a live request. */
function factsFromData(data: ProfileLoaderData): { [K in keyof ProfileFacts]: ProfileFacts[K] } {
    const langs = summarizeLanguages(data.repoReadmes);
    return {
        profile: { publicRepos: data.profile.public_repos, followers: data.profile.followers, following: data.profile.following },
        readme: { found: Boolean(data.profileReadme) },
        repos: { count: data.repoReadmes.length, languages: langs.length, topLanguage: langs[0]?.language ?? null, stars: data.repoReadmes.reduce((a, r) => a + r.stars, 0) },
        commits: { count: data.recentCommits.length, freshness: data.recentCommitFreshnessLabel, available: data.recentCommits.length > 0 },
    };
}

function reposFacts(repos: ProfileLoaderData["repoReadmes"]): ProfileFacts["repos"] {
    const langs = summarizeLanguages(repos);
    return { count: repos.length, languages: langs.length, topLanguage: langs[0]?.language ?? null, stars: repos.reduce((a, r) => a + r.stars, 0) };
}

type View = "insights" | "chat";
const CHAT_HASH = "#chat";
const subscribeHash = (cb: () => void) => {
    window.addEventListener("popstate", cb);
    window.addEventListener("hashchange", cb);
    return () => {
        window.removeEventListener("popstate", cb);
        window.removeEventListener("hashchange", cb);
    };
};
function useReducedMotionPref(): boolean {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        () => false,
    );
}

export function ProfileLoader({ username }: ProfileLoaderProps) {
    const [stages, dispatch] = useReducer(stagesReducer<ProfileFacts>, undefined, () => initialStages<ProfileFacts>(PROFILE_STAGE_LABELS));
    const [profileData, setProfileData] = useState<ProfileLoaderData | null>(null);
    const [model, setModel] = useState<SceneModel | null>(null);
    const [failure, setFailure] = useState<JourneyFailure | null>(null);
    const [cached, setCached] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [handoff, setHandoff] = useState<"running" | "fading" | "gone">("running");
    const [chatMounted, setChatMounted] = useState(false);
    const reducedMotion = useReducedMotionPref();
    // The URL hash is the source of truth for insights vs chat, so back and forward move between them.
    const hashIsChat = useSyncExternalStore(subscribeHash, () => window.location.hash === CHAT_HASH, () => false);
    const view: View = hashIsChat ? "chat" : "insights";
    const chatEverShown = chatMounted || hashIsChat;
    const pushedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const send = (ev: StageEvent<ProfileFacts>) => {
            if (!cancelled) dispatch(ev);
        };
        const inflight = new Set<keyof ProfileFacts>();
        const run = async () => {
            const stored = readCachedProfileLoaderData(username);
            if (stored) {
                const facts = factsFromData(stored);
                (Object.keys(facts) as (keyof ProfileFacts)[]).forEach((id) => send({ type: "done", id, facts: facts[id] } as StageEvent<ProfileFacts>));
                setCached(true);
                setModel(buildProfileScene(stored.profile, stored.repoReadmes, stored.recentCommits));
                setProfileData(stored);
                return;
            }
            try {
                inflight.add("profile");
                send({ type: "start", id: "profile" });
                const profile = await fetchProfile(username);
                inflight.delete("profile");
                send({ type: "done", id: "profile", facts: { publicRepos: profile.public_repos, followers: profile.followers, following: profile.following } });

                // The remaining requests are independent; each milestone lands when its own request resolves.
                (["readme", "repos", "commits"] as const).forEach((id) => {
                    inflight.add(id);
                    send({ type: "start", id });
                });
                const readmeP = fetchProfileReadme(username).then(
                    (readme) => {
                        inflight.delete("readme");
                        send({ type: "done", id: "readme", facts: { found: Boolean(readme) } });
                        return readme;
                    },
                    () => {
                        inflight.delete("readme");
                        send({ type: "done", id: "readme", facts: { found: false } });
                        return null;
                    },
                );
                const reposP = fetchUserRepos(username).then((repos) => {
                    inflight.delete("repos");
                    send({ type: "done", id: "repos", facts: reposFacts(repos) });
                    if (!cancelled) setModel(buildProfileScene(profile, repos, []));
                    return repos;
                });
                // Commits are optional context: a slow GitHub response must never hold back a finished analysis.
                const commitsSettled = Promise.race([
                    fetchRecentProfileCommitSnapshot(username),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), COMMITS_SOFT_TIMEOUT_MS)),
                ]);
                const commitsP = commitsSettled.then((snapshot) => {
                    inflight.delete("commits");
                    const ok = snapshot?.success === true;
                    const commits = ok ? snapshot.data.commits : [];
                    const freshness = ok ? snapshot.data.freshness.label : "GitHub API Unavailable";
                    send({ type: "done", id: "commits", facts: { count: commits.length, freshness, available: ok } });
                    return { commits, freshness };
                });
                const [profileReadme, repoReadmes, commitInfo] = await Promise.all([readmeP, reposP, commitsP]);
                if (cancelled) return;
                const nextData: ProfileLoaderData = {
                    profile,
                    profileReadme,
                    repoReadmes,
                    recentCommits: commitInfo.commits,
                    recentCommitFreshnessLabel: commitInfo.freshness,
                };
                setModel(buildProfileScene(profile, repoReadmes, commitInfo.commits));
                setProfileData(nextData);
                writeCachedProfileLoaderData(username, nextData);
            } catch (err: unknown) {
                console.warn("Profile analysis failed:", err);
                inflight.forEach((id) => send({ type: "fail", id }));
                if (!cancelled) setFailure(classifyFailure(getErrorMessage(err)));
            }
        };
        const timer = setTimeout(() => void run(), 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [username, attempt]);

    const retry = () => {
        dispatch({ type: "reset" });
        setFailure(null);
        setProfileData(null);
        setModel(null);
        setCached(false);
        setAttempt((n) => n + 1);
    };

    const openChat = () => {
        setChatMounted(true);
        pushedRef.current = true;
        window.history.pushState(null, "", CHAT_HASH);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    };
    const openInsights = () => {
        if (pushedRef.current) window.history.back();
        else {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
    };

    const onDone = () => {
        setHandoff("fading");
        window.setTimeout(() => setHandoff("gone"), 700);
    };

    const showWorkspace = profileData && handoff !== "running";
    return (
        <>
            {showWorkspace && (
                <>
                    <div hidden={view !== "insights"}>
                        <ProfileWorkspace
                            profile={profileData.profile}
                            repos={profileData.repoReadmes}
                            commits={profileData.recentCommits}
                            freshness={profileData.recentCommitFreshnessLabel}
                            reducedMotion={reducedMotion}
                            onAsk={openChat}
                        />
                    </div>
                    {chatEverShown && (
                        <div hidden={view !== "chat"}>
                            <ProfileChatInterface
                                profile={profileData.profile}
                                profileReadme={profileData.profileReadme}
                                repoReadmes={profileData.repoReadmes}
                                recentCommits={profileData.recentCommits}
                                recentCommitFreshnessLabel={profileData.recentCommitFreshnessLabel}
                            />
                            {view === "chat" && (
                                <button
                                    type="button"
                                    onClick={openInsights}
                                    className="fixed bottom-4 left-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-nv-graphite-600 bg-nv-graphite-900 px-4 text-nv-small font-medium text-nv-ivory-100 shadow-nv-lift hover:border-nv-copper-400"
                                >
                                    <ArrowLeft className="size-4" aria-hidden /> Back to insights
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
            {handoff !== "gone" && (
                <JourneyStage
                    kind="profile"
                    subject={username}
                    stages={stages}
                    model={model}
                    ready={profileData !== null}
                    failure={failure}
                    cached={cached}
                    exiting={handoff === "fading"}
                    onDone={onDone}
                    onRetry={retry}
                />
            )}
        </>
    );
}
