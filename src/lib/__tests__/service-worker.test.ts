import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type Listener = (event: Record<string, unknown>) => void;

function loadWorker(fetchImpl: () => Promise<Response>) {
    const listeners = new Map<string, Listener>();
    const put = vi.fn();
    const add = vi.fn(async () => undefined);
    const deleted: string[] = [];
    const offlinePage = new Response("offline");
    const caches = {
        open: vi.fn(async () => ({ add, put })),
        keys: vi.fn(async () => ["novaris-offline-v1", "github-api", "static-resources"]),
        delete: vi.fn(async (key: string) => {
            deleted.push(key);
            return true;
        }),
        match: vi.fn(async () => offlinePage),
    };
    const self = {
        location: { origin: "https://novaris.in" },
        addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
        skipWaiting: vi.fn(async () => undefined),
        clients: { claim: vi.fn(async () => undefined) },
    };
    const source = readFileSync(path.resolve(__dirname, "../../../public/sw.js"), "utf8");
    // Browsers resolve relative Request URLs against the worker origin; Node's Request does not.
    const WorkerRequest = class extends Request {
        constructor(input: string, init?: RequestInit) {
            super(new URL(input, self.location.origin), init);
        }
    };
    vm.runInNewContext(source, { self, caches, fetch: vi.fn(fetchImpl), Request: WorkerRequest, Response, URL, Promise });
    return { listeners, caches, put, add, deleted, offlinePage, self };
}

function dispatchFetch(listeners: Map<string, Listener>, url: string, mode: string, method = "GET") {
    let responded: Promise<Response> | undefined;
    listeners.get("fetch")!({
        request: { url, mode, method },
        respondWith: (value: Promise<Response>) => {
            responded = value;
        },
    });
    return responded;
}

describe("service worker", () => {
    it("precaches only the offline page and removes caches from earlier workers on activate", async () => {
        const worker = loadWorker(async () => new Response("ok"));
        let pending: Promise<unknown> | undefined;
        const waitUntil = (p: Promise<unknown>) => {
            pending = p;
        };

        worker.listeners.get("install")!({ waitUntil });
        await pending;
        expect(worker.add).toHaveBeenCalledTimes(1);
        expect(worker.self.skipWaiting).toHaveBeenCalled();

        worker.listeners.get("activate")!({ waitUntil });
        await pending;
        expect(worker.deleted).toEqual(["github-api", "static-resources"]);
        expect(worker.self.clients.claim).toHaveBeenCalled();
    });

    it("leaves API, streaming, non-GET, non-navigation and cross-origin requests to the network untouched", () => {
        const { listeners } = loadWorker(async () => new Response("ok"));

        expect(dispatchFetch(listeners, "https://novaris.in/api/chat/repo", "navigate")).toBeUndefined();
        expect(dispatchFetch(listeners, "https://novaris.in/api/auth/session", "cors")).toBeUndefined();
        expect(dispatchFetch(listeners, "https://novaris.in/dashboard", "navigate", "POST")).toBeUndefined();
        expect(dispatchFetch(listeners, "https://novaris.in/_next/static/app.js", "no-cors")).toBeUndefined();
        expect(dispatchFetch(listeners, "https://api.github.com/users/octocat", "navigate")).toBeUndefined();
    });

    it("serves navigations from the network without storing them, and falls back offline", async () => {
        const online = loadWorker(async () => new Response("dashboard"));
        const response = await dispatchFetch(online.listeners, "https://novaris.in/dashboard", "navigate");
        expect(await response!.text()).toBe("dashboard");
        expect(online.put).not.toHaveBeenCalled();

        const offline = loadWorker(async () => {
            throw new TypeError("network down");
        });
        const fallback = await dispatchFetch(offline.listeners, "https://novaris.in/dashboard", "navigate");
        expect(fallback).toBe(offline.offlinePage);
    });
});
