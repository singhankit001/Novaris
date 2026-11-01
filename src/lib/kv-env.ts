/**
 * Bidirectional environment variable normalization for Upstash Redis and Vercel KV.
 * Ensures consistent behavior whether UPSTASH_REDIS_REST_* or KV_REST_API_* is provided,
 * maintaining a single canonical contract (KV_REST_API_*) across the codebase.
 */

export function syncKvEnv(): void {
    if (typeof process === "undefined" || !process.env) return;

    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
        process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
        process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    }
}

// Initial sync on module load
syncKvEnv();

export function isKvConfigured(): boolean {
    return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
