"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export type ApiState<T> =
    | { status: "loading" }
    | { status: "ok"; data: T }
    | { status: "unauthorized"; code?: string; message: string }
    | { status: "error"; message: string; httpStatus?: number };

interface ErrorBody {
    error?: unknown;
    code?: unknown;
}

/**
 * GET a same-origin JSON API. Distinguishes sign-in problems from failures so each gets its own
 * recovery action. An INVALID_SESSION response signs the user out, matching the server guards.
 */
export function useApi<T>(url: string): { state: ApiState<T>; retry: () => void } {
    const [state, setState] = useState<ApiState<T>>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
                let body: unknown = null;
                try {
                    body = await res.json();
                } catch {
                    body = null;
                }
                if (res.ok) {
                    setState({ status: "ok", data: body as T });
                    return;
                }
                const err = (body ?? {}) as ErrorBody;
                const message = typeof err.error === "string" ? err.error : "The request failed.";
                const code = typeof err.code === "string" ? err.code : undefined;
                if (res.status === 401) {
                    if (code === "INVALID_SESSION") {
                        void signOut({ callbackUrl: "/?error=invalid_session" });
                    }
                    setState({ status: "unauthorized", code, message });
                    return;
                }
                setState({ status: "error", message, httpStatus: res.status });
            } catch (error) {
                if (controller.signal.aborted) return;
                setState({
                    status: "error",
                    message: error instanceof Error ? error.message : "The request failed.",
                });
            }
        })();
        return () => controller.abort();
    }, [url, attempt]);

    return {
        state,
        retry: () => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
        },
    };
}
