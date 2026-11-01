"use client";

import { getProviders, signIn } from "next-auth/react";

type SignInOptions = Parameters<typeof signIn>[1];
type AuthorizationParams = Parameters<typeof signIn>[2];

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
