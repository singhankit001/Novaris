"use client";

import { useEffect, useRef } from "react";

/**
 * Renders the real value on the server and first paint, then counts up from 0 on mount.
 * Reduced motion keeps the static value. The final text is always the exact value.
 */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const start = performance.now();
        let raf = requestAnimationFrame(function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            el.textContent = String(Math.round(value * (1 - (1 - t) ** 3)));
            if (t < 1) raf = requestAnimationFrame(tick);
        });
        return () => {
            cancelAnimationFrame(raf);
            el.textContent = String(value);
        };
    }, [value, duration]);

    return <span ref={ref}>{value}</span>;
}
