"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, KeyRound, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { signIn } from "next-auth/react";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Chat Error Boundary caught:", error);
    }, [error]);

    const isAuthError = error.message.includes("credentials") || error.name === "GitHubAuthError";
    const isRateLimit = error.message.includes("rate limit");

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="relative w-full max-w-xl">
                {/* Decorative background glows */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-3xl blur opacity-50" />
                
                {/* Main glassmorphic card */}
                <div className="relative p-8 md:p-12 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                    {/* Top Right decorative dots */}
                    <div className="absolute top-4 right-4 flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/80" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                        <div className="w-2 h-2 rounded-full bg-green-500/80" />
                    </div>

                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 mb-2">
                            {isAuthError ? (
                                <KeyRound className="w-10 h-10 text-red-400" />
                            ) : isRateLimit ? (
                                <RefreshCw className="w-10 h-10 text-orange-400" />
                            ) : (
                                <AlertTriangle className="w-10 h-10 text-red-400" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-white">
                                {isAuthError ? "GitHub Authentication Failed" : 
                                 isRateLimit ? "API Rate Limit Exceeded" : 
                                 "Failed to Load Repository"}
                            </h2>
                            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
                                {isAuthError 
                                    ? "Your GitHub token is invalid or expired. To analyze repositories, please sign in with GitHub."
                                    : isRateLimit
                                    ? "You have exceeded the GitHub API rate limits. Please sign in to increase your limits, or try again later."
                                    : "We encountered an unexpected error while trying to fetch the repository data. Please try again."}
                            </p>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl w-full text-left">
                            <div className="flex items-center gap-2 text-red-400 font-mono text-xs break-all">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                {error.message || "Unknown error occurred"}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full">
                            {(isAuthError || isRateLimit) ? (
                                <button
                                    onClick={() => signIn("github")}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    Sign In with GitHub
                                </button>
                            ) : (
                                <button
                                    onClick={() => reset()}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </button>
                            )}
                            
                            <Link
                                href="/"
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent hover:bg-white/5 text-zinc-300 rounded-xl transition-all border border-white/10 font-medium"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
