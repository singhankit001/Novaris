"use client";

import { getProviders, signIn } from "next-auth/react";

type SignInOptions = Parameters<typeof signIn>[1];
type AuthorizationParams = Parameters<typeof signIn>[2];

/**
 * Returns a record of currently configured authentication providers from Auth.js.
 */
export async function getAvailableProviders(): Promise<{
    github: boolean;
    google: boolean;
    resend: boolean;
}> {
    const providers = await getProviders().catch(() => null);
    return {
        github: Boolean(providers?.github),
        google: Boolean(providers?.google),
        resend: Boolean(providers?.resend),
    };
}

/**
 * Starts GitHub sign-in. When the server has no GitHub OAuth app configured, next-auth's own
 * signIn() silently bounces to the homepage; this sends the user to the homepage's
 * "sign-in is not available" notice instead.
 */
export async function signInWithGitHub(options?: SignInOptions, authorizationParams?: AuthorizationParams) {
    const providers = await getProviders().catch(() => null);
    if (!providers?.github) {
        // Not a component, so no router; a full load also matches next-auth's own redirects.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/?error=Configuration");
        return;
    }
    return signIn("github", options, authorizationParams);
}

/**
 * Starts Google sign-in.
 */
export async function signInWithGoogle(options?: SignInOptions, authorizationParams?: AuthorizationParams) {
    const providers = await getProviders().catch(() => null);
    if (!providers?.google) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/?error=Configuration");
        return;
    }
    return signIn("google", options, authorizationParams);
}

/**
 * Starts Email Magic Link sign-in via Resend.
 */
export async function signInWithEmail(email: string, options?: SignInOptions) {
    const providers = await getProviders().catch(() => null);
    if (!providers?.resend) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/?error=Configuration");
        return;
    }
    return signIn("resend", { ...options, email });
}
