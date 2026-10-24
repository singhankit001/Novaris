import Link from "next/link";
import { buttonClasses } from "@/components/nv/button-styles";
import { ErrorState } from "@/components/nv/states";

export type SharedLinkFailureReason = "invalid" | "expired" | "revoked";

export function SharedLinkFailureState({ reason }: { reason: SharedLinkFailureReason }) {
    const messages: Record<SharedLinkFailureReason, { title: string; body: string }> = {
        invalid: {
            title: "Invalid Share Link",
            body: "This report link is not valid. Ask the report owner to generate a fresh signed link.",
        },
        expired: {
            title: "Report Expired",
            body: "This report is no longer available. Run a new scan to generate a fresh report.",
        },
        revoked: {
            title: "Share Link Revoked",
            body: "The report owner revoked this link. Request a new signed link if access is still needed.",
        },
    };

    const content = messages[reason];

    return (
        <main id="nv-main" className="min-h-dvh">
            <ErrorState
                title={content.title}
                detail={`share link: ${reason}`}
                action={
                    <Link href="/" className={buttonClasses("secondary")}>
                        Back to search
                    </Link>
                }
            >
                <p>{content.body}</p>
                <p>Novaris uses signed, expiring report URLs to protect scan details.</p>
            </ErrorState>
        </main>
    );
}
