"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/nv/cn";

export type DemoName = "repo-analysis" | "developer-analysis" | "ai-chat" | "ai-chat-narrow" | "security-scan" | "code-review" | "architecture" | "select";

/** Pixel size each demo was rendered at. Used for the poster's intrinsic size and aspect ratio. */
const SIZES: Record<DemoName, [number, number]> = {
    "repo-analysis": [880, 400],
    "developer-analysis": [1020, 600],
    "ai-chat": [1250, 574],
    "ai-chat-narrow": [624, 784],
    "security-scan": [1020, 600],
    "code-review": [1020, 600],
    architecture: [640, 400],
    select: [800, 200],
};

interface DemoVideoProps {
    name: DemoName;
    /** Describes the demo for assistive tech. Omit for a decorative video (aria-hidden). */
    label?: string;
    /** Fill the positioned parent and letterbox (object-contain) instead of sizing by aspect ratio. */
    fill?: boolean;
    /** Shows the small "Illustrative" tag. */
    illustrative?: boolean;
    /** Corner for the tag; pick the one the demo's own UI leaves empty. */
    tagCorner?: "bottom-right" | "top-left";
    /** False while the demo is hidden (for example an inactive tab pane): no download, paused. */
    active?: boolean;
    className?: string;
}

function wantsStillOnly(): boolean {
    if (typeof window === "undefined") return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(prefers-reduced-data: reduce)").matches ||
        conn?.saveData === true
    );
}

/**
 * Looping product demo. The server renders only the poster (sized by aspect-ratio, so no layout shift).
 * The video mounts when the box nears the viewport, plays while visible and pauses when not.
 * Reduced motion, reduced data and Save-Data keep the poster and never download the video.
 */
export default function DemoVideo({ name, label, fill = false, illustrative = true, tagCorner = "bottom-right", active = true, className }: DemoVideoProps) {
    const box = useRef<HTMLDivElement>(null);
    const vid = useRef<HTMLVideoElement>(null);
    const [mount, setMount] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [w, h] = SIZES[name];
    const base = `/media/demos/${name}`;

    useEffect(() => {
        const el = box.current;
        if (!el || !active || wantsStillOnly() || typeof IntersectionObserver === "undefined") return;
        const near = new IntersectionObserver(
            ([e]) => {
                if (e?.isIntersecting) {
                    setMount(true);
                    near.disconnect();
                }
            },
            { rootMargin: "300px 0px" },
        );
        near.observe(el);
        return () => near.disconnect();
    }, [active]);

    useEffect(() => {
        const el = box.current;
        const v = vid.current;
        if (!mount || !el || !v) return;
        if (!active) {
            v.pause();
            return;
        }
        v.muted = true; // React does not reliably reflect the muted attribute
        const vis = new IntersectionObserver(([e]) => {
            if (e?.isIntersecting) v.play().catch(() => {});
            else v.pause();
        });
        vis.observe(el);
        return () => vis.disconnect();
    }, [mount, active]);

    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    return (
        <div
            ref={box}
            {...a11y}
            className={cn("relative overflow-hidden", fill ? "absolute inset-0" : "w-full", className)}
            style={fill ? undefined : { aspectRatio: `${w} / ${h}` }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`${base}-poster.webp`}
                alt=""
                width={w}
                height={h}
                decoding="async"
                className="absolute inset-0 size-full object-contain"
            />
            {mount && (
                <video
                    ref={vid}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="none"
                    aria-hidden
                    tabIndex={-1}
                    width={w}
                    height={h}
                    poster={`${base}-poster.webp`}
                    onPlaying={() => setPlaying(true)}
                    className={cn("absolute inset-0 size-full object-contain transition-opacity duration-300", playing ? "opacity-100" : "opacity-0")}
                >
                    <source src={`${base}.webm`} type="video/webm; codecs=vp9" />
                    <source src={`${base}.mp4`} type="video/mp4" />
                </video>
            )}
            {illustrative && (
                <span aria-hidden className={cn("pointer-events-none absolute rounded-full", tagCorner === "top-left" ? "top-1.5 left-1.5" : "right-1.5 bottom-1.5", "border border-nv-graphite-700 bg-white/90 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-nv-ivory-300")}>
                    Illustrative
                </span>
            )}
        </div>
    );
}
