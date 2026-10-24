"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const NEAR_BOTTOM_PX = 140;

/**
 * Keeps a scroller pinned to its end while content grows, unless the reader scrolled up.
 * `atBottom` drives the "latest" pill; `jump` scrolls and re-pins.
 */
export function useStickToBottom(scrollRef: RefObject<HTMLElement | null>, deps: unknown) {
    const [atBottom, setAtBottom] = useState(true);
    const pinned = useRef(true);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
            pinned.current = near;
            setAtBottom(near);
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [scrollRef]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.hasAttribute("data-hero")) {
            el.scrollTo({ top: 0, behavior: "auto" });
        } else if (pinned.current) {
            el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
        } else {
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX);
        }
    }, [deps, scrollRef]);

    const jump = (smooth = true) => {
        const el = scrollRef.current;
        if (!el) return;
        pinned.current = true;
        setAtBottom(true);
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    };

    return { atBottom, jump };
}
