import Link from "next/link";
import { buttonClasses } from "@/components/nv/button-styles";
import { ErrorState } from "@/components/nv/states";

interface ReportExpiredStateProps {
    owner?: string;
    repo?: string;
    expiresAt?: Date | number | string;
}

function formatExpiration(expiresAt?: Date | number | string): string | null {
    if (!expiresAt) return null;
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ReportExpiredState({ owner, repo, expiresAt }: ReportExpiredStateProps) {
    const formattedExpiry = formatExpiration(expiresAt);
    const rerunHref = owner && repo ? `/chat?q=${encodeURIComponent(`${owner}/${repo}`)}` : "/";

    return (
        <main id="nv-main" className="min-h-dvh">
            <ErrorState
                title="This report has expired"
                detail={formattedExpiry ? `expired ${formattedExpiry}` : "expired"}
                action={
                    <>
                        <Link href={rerunHref} className={buttonClasses("primary")}>
                            Rescan in repo chat
                        </Link>
                        <Link href="/" className={buttonClasses("secondary")}>
                            Back to search
                        </Link>
                    </>
                }
            >
                <p>Security reports are kept for 7 days. Run a fresh scan to regenerate it.</p>
            </ErrorState>
        </main>
    );
}
