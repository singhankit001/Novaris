"use client";

import { useEffect, useRef } from "react";

export function CursorGlow() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;
            const x = e.clientX + window.scrollX;
            const y = e.clientY + window.scrollY;
            ref.current.style.setProperty("--mouse-x", `${x}px`);
            ref.current.style.setProperty("--mouse-y", `${y}px`);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return <div ref={ref} className="cursor-glow-element" />;
}
