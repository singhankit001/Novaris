import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";
import OverviewStats from "@/components/Dashboard/OverviewStats";
import PageHeader from "@/components/Dashboard/PageHeader";
import ScansTable from "@/components/Dashboard/ScansTable";
import { buttonClasses } from "@/components/nv/button-styles";

export default async function DashboardPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const userId = getSessionUserId(session);
    const user = session?.user;
    if (!userId) {
        redirect(buildInvalidSessionSignOutRedirect());
    }
    if (!user) {
        redirect("/");
    }

    const name = user.username ?? user.name ?? "your account";

    return (
        <div className="space-y-10">
            <PageHeader
                eyebrow="Dashboard"
                title={`Signed in as ${name}`}
                description="Saved security scans for repositories you analyzed while signed in. Reports expire 7 days after the scan."
                actions={
                    <Link href="/" className={buttonClasses("primary")}>
                        Scan a repository
                    </Link>
                }
            />
            <section aria-labelledby="totals-h" className="space-y-4">
                <h2 id="totals-h" className="nv-eyebrow">
                    Totals
                </h2>
                <OverviewStats />
            </section>
            <section aria-labelledby="recent-h" className="space-y-4">
                <h2 id="recent-h" className="text-nv-title font-medium text-nv-ivory-50">
                    Recent scans
                </h2>
                <ScansTable limit={5} showViewAll />
            </section>
        </div>
    );
}
