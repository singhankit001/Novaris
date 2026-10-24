import { UnauthorizedState } from "@/components/nv/states";

export default function AdminLoginPage() {
    return <UnauthorizedState title="Admin access required" reason="Sign in with the configured admin GitHub account to view analytics." />;
}
