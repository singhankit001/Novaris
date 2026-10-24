import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/Dashboard/PageHeader";
import ScansTable from "@/components/Dashboard/ScansTable";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

export default async function ScansPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const userId = getSessionUserId(session);
    if (!userId) {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    return (
        <div className="space-y-8">
            <PageHeader eyebrow="Dashboard" title="Scans" description="Your 20 most recent saved scans. Each report opens in full." />
            <ScansTable limit={20} />
        </div>
    );
}
