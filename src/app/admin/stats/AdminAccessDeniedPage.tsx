import { ErrorState } from "@/components/nv/states";

export default function AdminAccessDeniedPage() {
    return (
        <ErrorState title="Access denied" detail="403">
            <p>You are signed in, but your account is not authorized to view this page.</p>
        </ErrorState>
    );
}
