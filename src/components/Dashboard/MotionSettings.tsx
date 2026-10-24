"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/nv/button";
import { Notice } from "@/components/nv/notice";
import { Skeleton } from "@/components/nv/skeleton";
import { usePreferences, type MotionPreference } from "@/lib/preferences-client";

const options: { value: MotionPreference; label: string; description: string }[] = [
    { value: "system", label: "Follow my device", description: "Use the reduced-motion setting of your operating system or browser." },
    { value: "reduced", label: "Reduced", description: "Turn off transitions and animation across Novaris pages that load this setting." },
    { value: "full", label: "Standard", description: "Animations as designed. A reduced-motion request from your device still applies." },
];

export default function MotionSettings() {
    const prefs = usePreferences();

    if (prefs.status === "loading") {
        return (
            <div role="status" aria-busy="true" className="space-y-3">
                <span className="sr-only">Loading your preferences</span>
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {prefs.status === "error" && (
                <Notice
                    tone="danger"
                    title="Could not load your saved preferences"
                    action={
                        <Button leading={<RefreshCw aria-hidden className="size-4" />} onClick={prefs.retry}>
                            Try again
                        </Button>
                    }
                >
                    {prefs.loadError} Changes below are kept in this browser until the server responds.
                </Notice>
            )}
            <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0" aria-describedby="motion-where">
                <legend className="mb-2 text-nv-small font-medium text-nv-ivory-200">Motion</legend>
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="flex min-h-16 cursor-pointer items-start gap-3 rounded-nv-sm border border-nv-graphite-600 bg-nv-graphite-950 p-4 hover:border-nv-graphite-500 has-[:checked]:border-nv-copper-500 has-[:checked]:bg-nv-copper-wash"
                    >
                        <input
                            type="radio"
                            name="motion"
                            value={option.value}
                            checked={prefs.motion === option.value}
                            onChange={() => void prefs.setMotion(option.value)}
                            className="mt-1 size-4 accent-nv-copper-400"
                        />
                        <span>
                            <span className="block text-nv-body text-nv-ivory-100">{option.label}</span>
                            <span className="block text-nv-small text-nv-ivory-300">{option.description}</span>
                        </span>
                    </label>
                ))}
            </fieldset>
            <p id="motion-where" className="text-nv-micro text-nv-ivory-300">
                {prefs.source === "account" ? "Saved to your Novaris account and applied on every device you sign in on." : "Stored in this browser only. Sign in to keep it with your account."}
            </p>
            <p role="status" aria-live="polite" className="min-h-5 text-nv-small text-nv-ivory-200">
                {prefs.saving ? "Saving..." : ""}
            </p>
            {prefs.saveError && (
                <Notice tone="danger" title="Your change was not saved and has been reverted">
                    {prefs.saveError}
                </Notice>
            )}
        </div>
    );
}
