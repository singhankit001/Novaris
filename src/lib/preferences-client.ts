"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useSyncExternalStore } from "react";

// Mirrors MOTION_VALUES in src/lib/preferences.ts (server). A client module cannot share
// non-component exports with server code, so the two lists are kept in step by the route test.
export const MOTION_OPTIONS = ["system", "reduced", "full"] as const;
export type MotionPreference = (typeof MOTION_OPTIONS)[number];

const STORAGE_KEY = "nv:motion";
const STYLE_ID = "nv-motion-preference";
const REDUCED_CSS = `html[data-nv-motion="reduced"] *, html[data-nv-motion="reduced"] *::before, html[data-nv-motion="reduced"] *::after {
  animation-duration: 0.001ms !important; animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important; scroll-behavior: auto !important;
}`;

function isMotion(value: unknown): value is MotionPreference {
    return typeof value === "string" && (MOTION_OPTIONS as readonly string[]).includes(value);
}

const listeners = new Set<() => void>();

function readLocal(): MotionPreference {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return isMotion(stored) ? stored : "system";
    } catch {
        return "system";
    }
}

/** Returns false when the browser refuses storage (private mode, disabled storage). */
function writeLocal(value: MotionPreference): boolean {
    try {
        window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
        return false;
    } finally {
        for (const listener of listeners) listener();
    }
    return true;
}

function subscribeLocal(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

/** Sets data-nv-motion on <html>; "reduced" collapses animation and transition durations. */
function applyMotion(motion: MotionPreference) {
    document.documentElement.dataset.nvMotion = motion;
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = REDUCED_CSS;
        document.head.appendChild(style);
    }
}

/** Mount once near the root so the stored choice applies on every page. Renders nothing. */
export function useMotionPreferenceSync() {
    const motion = useSyncExternalStore(subscribeLocal, readLocal, () => "system" as MotionPreference);
    useEffect(() => applyMotion(motion), [motion]);
}

type Remote =
    | { state: "idle" }
    | { state: "ready"; motion: MotionPreference }
    | { state: "error"; message: string };

export interface PreferencesApi {
    motion: MotionPreference;
    /** "signed-out" preferences live in this browser only. */
    source: "account" | "browser";
    status: "loading" | "ready" | "error";
    loadError: string | null;
    saveError: string | null;
    saving: boolean;
    setMotion: (next: MotionPreference) => Promise<boolean>;
    retry: () => void;
}

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const data: unknown = await res.json();
        if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") return data.error;
    } catch {
        // fall through
    }
    return fallback;
}

export function usePreferences(): PreferencesApi {
    const { status: authStatus } = useSession();
    const local = useSyncExternalStore(subscribeLocal, readLocal, () => "system" as MotionPreference);
    const [remote, setRemote] = useState<Remote>({ state: "idle" });
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const signedIn = authStatus === "authenticated";

    useEffect(() => {
        if (!signedIn || remote.state !== "idle") return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/preferences", { cache: "no-store" });
                if (!res.ok) throw new Error(await readError(res, "Could not load your preferences."));
                const data: unknown = await res.json();
                const motion =
                    typeof data === "object" && data !== null && "preferences" in data
                        ? (data.preferences as { motion?: unknown } | null)?.motion
                        : undefined;
                if (!isMotion(motion)) throw new Error("The server returned an unexpected preferences response.");
                if (cancelled) return;
                writeLocal(motion);
                setRemote({ state: "ready", motion });
            } catch (error) {
                if (cancelled) return;
                setRemote({ state: "error", message: error instanceof Error ? error.message : "Could not load your preferences." });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [signedIn, remote.state]);

    const motion = signedIn && remote.state === "ready" ? remote.motion : local;
    useEffect(() => applyMotion(motion), [motion]);

    async function setMotion(next: MotionPreference): Promise<boolean> {
        const previous = motion;
        setSaveError(null);
        if (!writeLocal(next) && !signedIn) {
            setSaveError("This browser blocked storing the preference.");
            return false;
        }
        if (!signedIn) return true;

        setRemote({ state: "ready", motion: next });
        setSaving(true);
        try {
            const res = await fetch("/api/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ motion: next }),
            });
            if (!res.ok) throw new Error(await readError(res, "Could not save your preference."));
            return true;
        } catch (error) {
            writeLocal(previous);
            setRemote({ state: "ready", motion: previous });
            setSaveError(error instanceof Error ? error.message : "Could not save your preference.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    const status: PreferencesApi["status"] =
        authStatus === "loading" ? "loading" : !signedIn ? "ready" : remote.state === "idle" ? "loading" : remote.state === "error" ? "error" : "ready";

    return {
        motion,
        source: signedIn ? "account" : "browser",
        status,
        loadError: remote.state === "error" ? remote.message : null,
        saveError,
        saving,
        setMotion,
        retry: () => setRemote({ state: "idle" }),
    };
}
