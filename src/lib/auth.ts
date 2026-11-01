import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { queueWelcomeEmailDelivery } from "./emails/delivery-service";
import authConfig, { isGitHubAuthConfigured, isGoogleAuthConfigured, isResendAuthConfigured } from "./auth.config";
import { prisma } from "./db";

const prismaAdapter = PrismaAdapter(prisma);

// Access and refresh tokens live in the encrypted session JWT. Nothing reads them from the database,
// so they are never written there.
const adapter: Adapter = {
    ...prismaAdapter,
    linkAccount: (account) =>
        prismaAdapter.linkAccount!({ ...account, access_token: undefined, refresh_token: undefined, id_token: undefined }),
};

// Sign-in only needs AUTH_SECRET and at least one configured OAuth app (GitHub or Google) or Email provider.
// Without a database, users still sign in (the session id is the account id); features that store data
// report storage as unavailable.
const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!isGitHubAuthConfigured && !isGoogleAuthConfigured && !isResendAuthConfigured) {
    console.warn("No authentication providers configured. Set AUTH_GITHUB_ID/AUTH_GITHUB_SECRET or AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: hasDatabase ? adapter : undefined,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, profile, account }) {
            if (hasDatabase && user?.id && user?.email) {
                const username =
                    (profile as { login?: string; name?: string } | undefined)?.login ||
                    (profile as { name?: string } | undefined)?.name ||
                    user.name ||
                    user.email.split("@")[0];
                queueWelcomeEmailDelivery({
                    userId: user.id,
                    toEmail: user.email,
                    username: String(username),
                }).catch((error: unknown) => {
                    console.error("Failed to queue welcome email:", error);
                });
            }

            if (hasDatabase && user?.id && account?.provider === "github" && (profile as { login?: string } | undefined)?.login) {
                await prisma.user
                    .update({
                        where: { id: user.id },
                        data: { githubLogin: (profile as { login: string }).login },
                    })
                    .catch((error: unknown) => {
                        console.error("Failed to persist githubLogin:", error);
                    });
            }
            return true;
        },
    },
});
