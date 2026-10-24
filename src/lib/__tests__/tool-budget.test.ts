import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal in-memory KV with the atomic ops the budget uses.
const store = vi.hoisted(() => ({ data: new Map<string, number>(), fail: false }));

vi.mock("@vercel/kv", () => {
    const guard = () => {
        if (store.fail) throw new Error("kv down");
    };
    return {
        kv: {
            incrby: async (key: string, n: number) => {
                guard();
                const next = (store.data.get(key) ?? 0) + n;
                store.data.set(key, next);
                return next;
            },
            decrby: async (key: string, n: number) => {
                guard();
                const next = (store.data.get(key) ?? 0) - n;
                store.data.set(key, next);
                return next;
            },
            expire: async () => {
                guard();
                return 1;
            },
            get: async (key: string) => {
                guard();
                return store.data.get(key) ?? null;
            },
        },
    };
});

import { getToolBudgetUsage, reserveToolBudget } from "@/lib/cache";

const sum = () => Array.from(store.data.values()).reduce((a, b) => a + b, 0);

describe("atomic tool budget", () => {
    beforeEach(() => {
        store.data.clear();
        store.fail = false;
    });

    it("concurrent reservations never grant more than the limit (anonymous limit 10, 5 x 3 units)", async () => {
        const results = await Promise.all(
            Array.from({ length: 5 }, () => reserveToolBudget("repo", "anonymous", "anon_1", 3))
        );
        const granted = results.reduce((total, r) => total + (r.status === "granted" ? r.reserved : 0), 0);
        expect(granted).toBe(10);
        expect(sum()).toBe(10); // excess was handed back, key never stays above the limit
        expect(results.filter((r) => r.status === "exhausted")).toHaveLength(1);
    });

    it("refunds the whole reservation for a failed run and unused units for a completed one", async () => {
        const failed = await reserveToolBudget("repo", "authenticated", "u1", 3);
        if (failed.status !== "granted") throw new Error("expected grant");
        await failed.settle(2, false);
        expect(sum()).toBe(0);

        const done = await reserveToolBudget("repo", "authenticated", "u1", 3);
        if (done.status !== "granted") throw new Error("expected grant");
        await done.settle(1, true);
        await done.settle(1, true); // settle is idempotent
        expect(sum()).toBe(1);
    });

    it("enforces the stricter of cookie actor and network keys", async () => {
        store.data.set(`tool_budget:repo:anonymous:ip_net:${new Date().toISOString().slice(0, 10)}`, 9);
        const r = await reserveToolBudget("repo", "anonymous", ["anon_fresh", "ip_net"], 3);
        expect(r.status).toBe("granted");
        if (r.status === "granted") expect(r.reserved).toBe(1);
        // the fresh cookie key was trimmed to match, so it cannot hold extra budget
        const usage = await getToolBudgetUsage("repo", "anonymous", ["anon_fresh", "ip_net"]);
        expect(usage.used).toBe(10);
        expect(usage.remaining).toBe(0);
    });

    it("fails closed when KV is down, for reservation and for reads", async () => {
        store.fail = true;
        expect((await reserveToolBudget("repo", "anonymous", "anon_1")).status).toBe("unavailable");
        const usage = await getToolBudgetUsage("repo", "anonymous", "anon_1");
        expect(usage).toMatchObject({ remaining: 0, unavailable: true });
    });
});
