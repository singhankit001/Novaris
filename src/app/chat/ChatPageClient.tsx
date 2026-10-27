"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeGitHubInput } from "@/lib/utils";
import dynamic from "next/dynamic";

// Holds the luminous canvas while the journey code loads, so the page never flashes blank.
function JourneyBoot() {
    return <div aria-hidden className="nv-aurora fixed inset-0 z-30 bg-nv-graphite-950" />;
}

const ProfileLoader = dynamic(() => import("@/components/ProfileLoader").then((mod) => mod.ProfileLoader), {
    ssr: false,
    loading: JourneyBoot,
});

const RepoLoader = dynamic(() => import("@/components/RepoLoader").then((mod) => mod.RepoLoader), {
    ssr: false,
    loading: JourneyBoot,
});

export default function ChatPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawQuery = searchParams.get("q") ?? "";
    const prompt = searchParams.get("prompt") ?? undefined;
    const query = useMemo(() => normalizeGitHubInput(rawQuery), [rawQuery]);

    useEffect(() => {
        if (!query) {
            router.replace("/");
        }
    }, [query, router]);

    if (!query) {
        return null;
    }

    if (!query.includes("/")) {
        return <ProfileLoader username={query} />;
    }

    return <RepoLoader query={query} initialPrompt={prompt} />;
}
