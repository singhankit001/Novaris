import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { queueWelcomeEmailDelivery } from "./emails/delivery-service";
import authConfig from "./auth.config";
import { prisma } from "./db";

const prismaAdapter = PrismaAdapter(prisma);

// The GitHub token lives only in the encrypted session JWT. Nothing reads it from the database,
// so it is never written there.
const adapter: Adapter = {
    ...prismaAdapter,
    linkAccount: (account) =>
        prismaAdapter.linkAccount!({ ...account, access_token: undefined, refresh_token: undefined, id_token: undefined }),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, profile }) {
            if (user?.id && user?.email) {
                const username = profile?.login || user.name || user.email.split("@")[0];
                queueWelcomeEmailDelivery({
                    userId: user.id,
                    toEmail: user.email,
                    username: String(username),
                }).catch((error: unknown) => {
                    console.error("Failed to queue welcome email:", error);
                });
            }

            if (user?.id && profile?.login) {
                await prisma.user
                    .update({
                        where: { id: user.id },
                        data: { githubLogin: profile.login },
                    })
                    .catch((error: unknown) => {
                        console.error("Failed to persist githubLogin:", error);
                    });
            }
            return true;
        },
    },
});
