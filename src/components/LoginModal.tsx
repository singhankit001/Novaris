"use client";

import { useState } from "react";
import { Github, Mail, ArrowRight } from "lucide-react";
import { signInWithGitHub, signInWithGoogle, signInWithEmail } from "@/lib/sign-in";
import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    );
}

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    callbackUrl?: string;
    scope?: string;
}

export function LoginModal({
    isOpen,
    onClose,
    title = "Sign in to Novaris",
    description = "Sign in to unlock Gemini Thinking mode, deep security scans, and saved reports.",
    callbackUrl,
    scope,
}: LoginModalProps) {
    const [email, setEmail] = useState("");
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    const handleGoogleSignIn = () => {
        void signInWithGoogle(callbackUrl ? { callbackUrl } : undefined);
    };

    const handleGitHubSignIn = () => {
        void signInWithGitHub(
            callbackUrl ? { callbackUrl } : undefined,
            scope ? { scope } : undefined
        );
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || emailLoading) return;
        setEmailLoading(true);
        try {
            await signInWithEmail(email.trim(), callbackUrl ? { callbackUrl } : undefined);
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            footer={
                <Button onClick={onClose} variant="secondary">
                    Not now
                </Button>
            }
        >
            <div className="space-y-3 pt-1">
                {/* Google Sign-in */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex min-h-11 w-full items-center justify-center gap-3 rounded-nv-sm border border-nv-graphite-700 bg-white px-4 py-2.5 text-nv-body font-medium text-nv-ivory-100 shadow-sm transition hover:bg-nv-graphite-850 focus:outline-none focus:ring-2 focus:ring-nv-copper-400"
                >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                </button>

                {/* GitHub Sign-in */}
                <button
                    type="button"
                    onClick={handleGitHubSignIn}
                    className="flex min-h-11 w-full items-center justify-center gap-3 rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-900 px-4 py-2.5 text-nv-body font-medium text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-nv-copper-400"
                >
                    <Github className="size-4" aria-hidden="true" />
                    <span>Continue with GitHub</span>
                </button>

                {/* Divider */}
                <div className="relative my-4 flex items-center justify-center">
                    <div className="w-full border-t border-nv-graphite-700" />
                    <span className="absolute bg-white px-3 text-xs uppercase tracking-wider text-nv-ivory-300">
                        or
                    </span>
                </div>

                {/* Email Sign-in toggle / form */}
                {!showEmailInput ? (
                    <button
                        type="button"
                        onClick={() => setShowEmailInput(true)}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-nv-sm border border-transparent px-4 py-2 text-nv-small text-nv-ivory-200 transition hover:bg-nv-graphite-850 hover:text-nv-ivory-100"
                    >
                        <Mail className="size-4" aria-hidden="true" />
                        <span>Sign in with Email</span>
                    </button>
                ) : (
                    <form onSubmit={handleEmailSignIn} className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="min-h-10 flex-1 rounded-nv-sm border border-nv-graphite-700 bg-white px-3 py-1.5 text-nv-body text-nv-ivory-100 placeholder:text-nv-ivory-300 focus:border-nv-copper-400 focus:outline-none focus:ring-1 focus:ring-nv-copper-400"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={emailLoading}
                                leading={emailLoading ? undefined : <ArrowRight className="size-4" />}
                            >
                                {emailLoading ? "Sending..." : "Send link"}
                            </Button>
                        </div>
                        <p className="text-xs text-nv-ivory-300">
                            We’ll send a magic sign-in link to your email address.
                        </p>
                    </form>
                )}
            </div>
        </Dialog>
    );
}
