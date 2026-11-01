import { spawn } from "node:child_process";
import { config } from "dotenv";
import { createMockKvServer } from "./mock-kv-server.mjs";

config({ path: ".env.local" });
config();

const port = Number(process.env.E2E_PORT ?? 3100);
const kvPort = Number(process.env.MOCK_KV_PORT ?? 8099);

async function main() {
    let mockKv = null;
    let kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    let kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) {
        mockKv = await createMockKvServer(kvPort);
        kvUrl = mockKv.url;
        kvToken = mockKv.token;
        console.log(`[E2E Runner] Mock KV running at ${kvUrl}`);
    } else {
        console.log(`[E2E Runner] Using configured live KV: ${new URL(kvUrl).host}`);
    }

    const env = {
        ...process.env,
        KV_REST_API_URL: kvUrl,
        KV_REST_API_TOKEN: kvToken,
        UPSTASH_REDIS_REST_URL: kvUrl,
        UPSTASH_REDIS_REST_TOKEN: kvToken,
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://ankitsingh@localhost:5432/novaris_dev",
        DIRECT_URL: process.env.DIRECT_URL || "postgresql://ankitsingh@localhost:5432/novaris_dev",
    };

    const nextProc = spawn("npx", ["next", "start", "-p", String(port)], {
        env,
        stdio: "inherit",
    });

    const cleanup = async () => {
        nextProc.kill("SIGTERM");
        if (mockKv) await mockKv.close();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    nextProc.on("exit", async (code) => {
        if (mockKv) await mockKv.close();
        process.exit(code ?? 0);
    });
}

main().catch((err) => {
    console.error("[E2E Runner Error]", err);
    process.exit(1);
});
