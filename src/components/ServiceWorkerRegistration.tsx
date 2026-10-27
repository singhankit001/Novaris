"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

        // updateViaCache "none" makes the browser bypass HTTP caches when checking for a new worker.
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error: unknown) => {
            console.error("Service worker registration failed:", error);
        });
    }, []);

    return null;
}
