"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { btnClass } from "@/components/seo/blocks";
import { fetchProfile } from "@/app/actions";

interface DeveloperCardProps {
    username: string;
    name?: string;
    avatar?: string;
    bio?: string;
    location?: string;
    blog?: string;
}

function safeBlogHref(blog: string): string | null {
    try {
        const url = new URL(blog.startsWith("http") ? blog : `https://${blog}`);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
        return null;
    }
}

export function DeveloperCard({ username, name, avatar, bio, location, blog }: DeveloperCardProps) {
    const [profile, setProfile] = useState({ name, avatar, bio, location, blog });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!username || (avatar && bio && name)) return;
        let cancelled = false;
        queueMicrotask(() => { if (!cancelled) setLoading(true); });
        fetchProfile(username)
            .then((data) => {
                if (cancelled || !data) return;
                setProfile((prev) => ({
                    name: data.name || prev.name,
                    avatar: data.avatar_url || prev.avatar,
                    bio: data.bio || prev.bio,
                    location: data.location || prev.location,
                    blog: data.blog || prev.blog,
                }));
            })
            .catch(() => undefined)
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [username, avatar, bio, name]);

    const blogHref = profile.blog ? safeBlogHref(profile.blog) : null;
    return (
        <aside aria-label={`Developer ${username}`} aria-busy={loading} className="not-prose my-4 flex flex-col gap-4 rounded-nv-lg border border-nv-graphite-700 bg-white p-5 shadow-nv-card sm:flex-row">
            <Image
                src={profile.avatar || `https://github.com/${encodeURIComponent(username)}.png`}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="size-14 shrink-0 rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-850 object-cover"
            />
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-nv-body font-medium text-nv-ivory-50">{profile.name || username}</h3>
                <p className="truncate font-mono text-nv-micro text-nv-ivory-300">@{username}</p>
                {profile.bio && <p className="mt-2 line-clamp-2 text-nv-small text-nv-ivory-200">{profile.bio}</p>}
                {(profile.location || blogHref) && (
                    <p className="mt-2 flex flex-wrap gap-x-3 text-nv-micro text-nv-ivory-300">
                        {profile.location && <span>{profile.location}</span>}
                        {blogHref && (
                            <a href={blogHref} target="_blank" rel="noopener noreferrer" className="truncate text-nv-copper-400 underline underline-offset-2">
                                {blogHref.replace(/^https?:\/\//, "").slice(0, 30)}
                            </a>
                        )}
                    </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/chat?q=${encodeURIComponent(username)}`} className={btnClass("primary")}>Analyze profile</Link>
                    <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer" className={btnClass("secondary")}>
                        GitHub <ExternalLink aria-hidden className="size-4" />
                    </a>
                </div>
            </div>
        </aside>
    );
}
