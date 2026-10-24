import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { User } from "lucide-react";
import { getSessionGitHubAuth } from "@/lib/github-api";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState } from "@/lib/session-guard";
import MotionSettings from "@/components/Dashboard/MotionSettings";
import PageHeader from "@/components/Dashboard/PageHeader";
import { Badge } from "@/components/nv/badge";
import { Panel } from "@/components/nv/panel";

export default async function SettingsPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const user = session?.user;
    if (!user) {
        redirect("/");
    }

    // The browser session carries no token or scope, so read them from the encrypted cookie on the server.
    const { accessToken, scope } = await getSessionGitHubAuth();
    const scopes = (scope ?? "").split(/[\s,]+/).filter(Boolean);
    const hasPrivateAccess = scopes.includes("repo");

    return (
        <div className="space-y-8">
            <PageHeader eyebrow="Dashboard" title="Settings" description="Your GitHub connection and the display preferences Novaris can save for you." />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel as="section" className="rounded-3xl p-6 sm:p-8 [&>div]:p-0">
                    <p className="nv-eyebrow">Account</p>
                    <h2 className="mb-5 text-nv-title font-medium text-nv-ivory-50">GitHub connection</h2>
                    <div className="flex items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-nv-md border border-nv-graphite-600 bg-nv-graphite-850">
                            {user.image ? (
                                <Image src={user.image} alt={`Avatar of ${user.username ?? user.name ?? "your account"}`} width={64} height={64} className="object-cover" />
                            ) : (
                                <User aria-hidden className="size-7 text-nv-ivory-300" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-nv-title text-nv-ivory-50">{user.name ?? user.username ?? "GitHub user"}</p>
                            {user.username && <p className="truncate font-mono text-nv-small text-nv-ivory-300">@{user.username}</p>}
                            {user.email && <p className="truncate text-nv-small text-nv-ivory-300">{user.email}</p>}
                        </div>
                    </div>
                    <dl className="mt-6 space-y-5 border-t border-nv-graphite-700 pt-6">
                        <div>
                            <dt className="nv-eyebrow">Token in this session</dt>
                            <dd className="m-0 mt-1 text-nv-body text-nv-ivory-100">
                                {accessToken ? "Present. It stays on the server and is never sent to your browser." : "Not available. Grant repository access from My repositories to list your repos."}
                            </dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Granted GitHub scopes</dt>
                            <dd className="m-0 mt-2">
                                {scopes.length > 0 ? (
                                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                        {scopes.map((s) => (
                                            <li key={s}>
                                                <Badge>{s}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-nv-body text-nv-ivory-200">None recorded for this session.</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Private repository access</dt>
                            <dd className="m-0 mt-1 text-nv-body text-nv-ivory-100">
                                {hasPrivateAccess ? "Granted (repo scope)." : "Not granted. Only public repositories are listed."}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-6 text-nv-small text-nv-ivory-300">Saved scans and their reports expire automatically 7 days after the scan.</p>
                </Panel>

                <Panel as="section" className="rounded-3xl p-6 sm:p-8 [&>div]:p-0">
                    <p className="nv-eyebrow">Preferences</p>
                    <h2 className="mb-5 text-nv-title font-medium text-nv-ivory-50">Display</h2>
                    <MotionSettings />
                </Panel>
            </div>
        </div>
    );
}
