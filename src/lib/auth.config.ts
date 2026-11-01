import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { INVALID_SESSION_ERROR_CODE } from "./session-guard";

// GitHub rejects an authorize request with an empty client_id, so an unconfigured provider is
// left out entirely. Clients then see no "github" provider and show the configuration notice.
export const isGitHubAuthConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
export const isGoogleAuthConfigured = Boolean(
    (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
    (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)
);
export const isResendAuthConfigured = Boolean(process.env.RESEND_API_KEY);

const configuredProviders: NextAuthConfig["providers"] = [];

if (isGitHubAuthConfigured) {
    configuredProviders.push(
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
        })
    );
}

if (isGoogleAuthConfigured) {
    configuredProviders.push(
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        })
    );
}

if (isResendAuthConfigured) {
    configuredProviders.push(
        Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.RESEND_FROM_EMAIL || "Novaris <login@novaris.dev>",
        })
    );
}

const authConfig: NextAuthConfig = {
    trustHost: true,
    providers: configuredProviders,
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            }
            return true;
        },
        async jwt({ token, profile, account, user }) {
            const candidateUserId = user?.id ?? token.id ?? token.sub;
            token.id = typeof candidateUserId === "string" ? candidateUserId : undefined;

            if (account?.provider === "github") {
                if (typeof profile?.login === "string") {
                    token.username = profile.login;
                }
                if (account?.access_token) {
                    token.accessToken = account.access_token;
                }
                if (account?.scope) {
                    token.oauthScope = account.scope;
                }
            } else if (account?.provider === "google") {
                const candidateName =
                    (profile as { name?: string } | undefined)?.name ||
                    user?.name ||
                    (user?.email ? user.email.split("@")[0] : undefined);
                if (typeof candidateName === "string" && !token.username) {
                    token.username = candidateName;
                }
            } else if (user?.email) {
                const candidateName = user.name || user.email.split("@")[0];
                if (typeof candidateName === "string" && !token.username) {
                    token.username = candidateName;
                }
            }

            if (typeof profile?.login === "string" && !token.username) {
                token.username = profile.login;
            }

            if (user?.email && !token.email) {
                token.email = user.email;
            }

            if (!token.id) {
                token.error = INVALID_SESSION_ERROR_CODE;
            } else {
                delete token.error;
            }
            return token;
        },
        async session({ session, token }) {
            const resolvedUserId = typeof token.id === "string" ? token.id : (typeof token.sub === "string" ? token.sub : undefined);
            if (resolvedUserId && session.user) {
                session.user.id = resolvedUserId;
            }
            if (typeof token.username === "string" && session.user) {
                session.user.username = token.username;
            }
            if (typeof token.email === "string" && session.user && !session.user.email) {
                session.user.email = token.email;
            }
            // token.accessToken stays in the encrypted JWT; server code reads it with
            // getSessionGitHubToken(). Copying it here would expose it to the browser.
            if (!resolvedUserId) {
                session.error = INVALID_SESSION_ERROR_CODE;
            }
            return session;
        },
    },
    pages: {
        signIn: "/",
        // Sign-in failures land on the homepage, which explains them (HomeClient).
        error: "/",
    },
};

export default authConfig;
