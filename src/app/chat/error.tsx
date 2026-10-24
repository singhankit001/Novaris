"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, KeyRound, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { signIn } from "next-auth/react";
import { buttonClasses } from "@/components/nv/button-styles";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Chat Error Boundary caught:", error);
    }, [error]);

    const isAuthError = error.message.includes("credentials") || error.name === "GitHubAuthError";
    const isRateLimit = error.message.includes("rate limit");

    return (
        <div className="nv-aurora flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
            <div className="nv-holo-ring relative w-full max-w-xl rounded-nv-xl bg-nv-graphite-900 p-8 shadow-nv-overlay md:p-12">
                <div className="flex flex-col items-start space-y-6">
                    <span aria-hidden className="grid size-12 place-items-center rounded-nv-sm border border-nv-danger-edge bg-nv-danger-wash text-nv-danger">
                        {isAuthError ? <KeyRound className="size-5" /> : isRateLimit ? <RefreshCw className="size-5" /> : <AlertTriangle className="size-5" />}
                    </span>

                    <div className="space-y-2" role="alert">
                        <h2 className="nv-display text-nv-display-md text-balance">
                            {isAuthError ? "GitHub authentication failed" : isRateLimit ? "GitHub rate limit reached" : "Failed to load the analysis"}
                        </h2>
                        <p className="max-w-md text-nv-body text-nv-ivory-200 text-pretty">
                            {isAuthError
                                ? "Your GitHub token is invalid or expired. Sign in with GitHub to analyze repositories."
                                : isRateLimit
                                  ? "The GitHub API rate limit was reached. Sign in to raise your limits, or try again later."
                                  : "Something went wrong while fetching the data. Nothing was lost; try again."}
                        </p>
                    </div>

                    <p className="flex w-full items-start gap-2 break-all rounded-nv-xs bg-nv-graphite-850 px-3 py-2 font-mono text-nv-micro text-nv-ivory-300">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {error.message || "Unknown error occurred"}
                    </p>

                    <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row">
                        {isAuthError || isRateLimit ? (
                            <button type="button" onClick={() => signIn("github")} className={buttonClasses("primary", "md", "flex-1")}>
                                <KeyRound className="size-4" aria-hidden /> Sign in with GitHub
                            </button>
                        ) : (
                            <button type="button" onClick={() => reset()} className={buttonClasses("primary", "md", "flex-1")}>
                                <RefreshCw className="size-4" aria-hidden /> Try again
                            </button>
                        )}
                        <Link href="/" className={buttonClasses("secondary", "md", "flex-1")}>
                            <Home className="size-4" aria-hidden /> Go home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
