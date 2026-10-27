"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface IOSNavigator extends Navigator {
    MSStream?: unknown;
    standalone?: boolean;
}

function isIosDevice(): boolean {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as IOSNavigator;
    return /iPad|iPhone|iPod/.test(nav.userAgent) && !nav.MSStream;
}

function isInstalled(): boolean {
    if (typeof window === "undefined") return false;

    const nav = window.navigator as IOSNavigator;
    const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const displayModeFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
    const displayModeMinimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;
    const iosStandalone = nav.standalone === true;
    const androidTrustedWebApp = document.referrer.startsWith("android-app://");

    return displayModeStandalone || displayModeFullscreen || displayModeMinimalUi || iosStandalone || androidTrustedWebApp;
}

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const ios = isIosDevice();
        const inst = isInstalled();
        const timer = setTimeout(() => {
            setIsIOS(ios);
            setInstalled(inst);
        }, 0);

        const media = window.matchMedia("(display-mode: standalone)");
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        const handleAppInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };
        const handleDisplayModeChange = () => {
            setInstalled(isInstalled());
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);
        media.addEventListener("change", handleDisplayModeChange);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            media.removeEventListener("change", handleDisplayModeChange);
        };
    }, []);

    useEffect(() => {
        const shouldShow = !installed && (Boolean(deferredPrompt) || isIOS);
        if (!shouldShow) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        const timer = setTimeout(() => {
            setVisible(true);
        }, 120);
        return () => clearTimeout(timer);
    }, [deferredPrompt, installed, isIOS]);

    const handleInstallClick = async () => {
        if (isIOS) {
            toast.info("To install on iOS: tap 'Share' then 'Add to Home Screen'", {
                duration: 5000,
                icon: <Download className="size-4" />
            });
            return;
        }

        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    if (installed || (!deferredPrompt && !isIOS)) return null;

    return (
        <button
            type="button"
            onClick={handleInstallClick}
            aria-label="Install app"
            title="Install app"
            className={`fixed bottom-4 right-4 z-20 flex size-12 touch-manipulation items-center justify-center rounded-full border border-nv-copper-400 bg-nv-copper-400 text-white shadow-nv-popover transition-[opacity,transform,background-color] duration-200 hover:bg-nv-copper-300 motion-safe:active:scale-95 md:hidden ${
                visible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
        >
            <Download aria-hidden className="size-5" />
        </button>
    );
}
