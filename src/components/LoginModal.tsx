"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";

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
    title = "Sign in to continue",
    description = "Signing in with GitHub unlocks Thinking mode, deep security scans and saved reports. Public analysis works without it.",
    callbackUrl,
    scope,
}: LoginModalProps) {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            footer={
                <>
                    <Button onClick={onClose}>Not now</Button>
                    <Button
                        variant="primary"
                        onClick={() => signIn("github", callbackUrl ? { callbackUrl } : undefined, scope ? { scope } : undefined)}
                    >
                        Sign in with GitHub
                    </Button>
                </>
            }
        />
    );
}
