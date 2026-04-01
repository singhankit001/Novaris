"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserIcon } from "@/components/icons/UserIcon";
import { cn } from "@/lib/utils";
import { fetchGitHubAvatarUrl } from "@/app/actions";

interface UserAvatarProps {
    username?: string;
    className?: string;
}

interface AvatarCache {
    url: string;
    updatedAt: number;
    userId: string;
}

const CACHE_KEY_PREFIX = "novaris:github-avatar:";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function UserAvatar({ username, className }: UserAvatarProps) {
    const { data: session } = useSession();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const user = session?.user as { username?: string; githubLogin?: string } | undefined;
    const effectiveUsername = username || user?.username || user?.githubLogin;
    const userId = session?.user?.id;

    useEffect(() => {
        if (!effectiveUsername) {
            const timer = setTimeout(() => {
                setAvatarUrl(null);
            }, 0);
            return () => clearTimeout(timer);
        }

        const cacheKey = `${CACHE_KEY_PREFIX}${effectiveUsername}`;
        const sessionKey = `${cacheKey}:session-refetched`;
        const cached = localStorage.getItem(cacheKey);
        const sessionRefetched = sessionStorage.getItem(sessionKey);
        const now = Date.now();

        let shouldFetch = true;
        let syncTimer: NodeJS.Timeout | undefined;

        if (cached && sessionRefetched) {
            try {
                const parsed = JSON.parse(cached) as AvatarCache;
                const isExpired = now - parsed.updatedAt > CACHE_DURATION;
                const isNewUser = userId && parsed.userId !== userId;

                if (!isExpired && !isNewUser) {
                    syncTimer = setTimeout(() => {
                        setAvatarUrl(parsed.url);
                    }, 0);
                    shouldFetch = false;
                }
            } catch (e) {
                console.error("Failed to parse avatar cache", e);
            }
        }

        if (shouldFetch) {
            const fetchAvatar = async () => {
                try {
                    const result = await fetchGitHubAvatarUrl(effectiveUsername);
                    if (result.url) {
                        setAvatarUrl(result.url);
                        localStorage.setItem(cacheKey, JSON.stringify({
                            url: result.url,
                            updatedAt: now,
                            userId: userId || "",
                        }));
                        sessionStorage.setItem(sessionKey, "true");
                    } else {
                        setError(true);
                    }
                } catch (e) {
                    console.error("Failed to fetch GitHub avatar via action", e);
                    setError(true);
                }
            };

            fetchAvatar();
        }

        return () => {
            if (syncTimer) {
                clearTimeout(syncTimer);
            }
        };
    }, [effectiveUsername, userId]);

    if (!avatarUrl || error) {
        return <UserIcon className={cn("w-full h-full text-zinc-300", className)} />;
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={effectiveUsername || "User"} className={cn("w-full h-full object-cover", className)} onError={() => setError(true)} />;
}
