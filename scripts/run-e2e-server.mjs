import { spawn } from "node:child_process";
import { createMockKvServer } from "./mock-kv-server.mjs";

const port = Number(process.env.E2E_PORT ?? 3100);
const kvPort = Number(process.env.MOCK_KV_PORT ?? 8099);

async function main() {
    const mockKv = await createMockKvServer(kvPort);
    console.log(`[E2E Runner] Mock KV running at ${mockKv.url}`);

    const env = {
        ...process.env,
        KV_REST_API_URL: process.env.KV_REST_API_URL || mockKv.url,
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || mockKv.token,
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://ankitsingh@localhost:5432/novaris_dev",
        DIRECT_URL: process.env.DIRECT_URL || "postgresql://ankitsingh@localhost:5432/novaris_dev",
    };

    const nextProc = spawn("npx", ["next", "start", "-p", String(port)], {
        env,
        stdio: "inherit",
    });

    const cleanup = async () => {
        nextProc.kill("SIGTERM");
        await mockKv.close();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    nextProc.on("exit", async (code) => {
        await mockKv.close();
        process.exit(code ?? 0);
    });
}

main().catch((err) => {
    console.error("[E2E Runner Error]", err);
    process.exit(1);
});

