import { syncKvEnv } from "@/lib/kv-env";

export async function register() {
    syncKvEnv();
}
