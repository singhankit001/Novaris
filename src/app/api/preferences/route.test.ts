import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, upsertMock, findUniqueMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    upsertMock: vi.fn(),
    findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
    prisma: { userPreference: { upsert: upsertMock, findUnique: findUniqueMock } },
}));

import { GET, PUT } from "@/app/api/preferences/route";
import { MOTION_VALUES } from "@/lib/preferences";
import { MOTION_OPTIONS } from "@/lib/preferences-client";

function put(body: unknown, raw = false) {
    return new Request("http://localhost/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: raw ? (body as string) : JSON.stringify(body),
    });
}

describe("/api/preferences", () => {
    beforeEach(() => {
        authMock.mockReset();
        upsertMock.mockReset();
        findUniqueMock.mockReset();
    });

    it("keeps the client and server motion lists identical", () => {
        expect([...MOTION_OPTIONS]).toEqual([...MOTION_VALUES]);
    });

    it("returns 401 when signed out (GET and PUT) and never touches the database", async () => {
        authMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
        expect((await PUT(put({ motion: "reduced" }))).status).toBe(401);
        expect(findUniqueMock).not.toHaveBeenCalled();
        expect(upsertMock).not.toHaveBeenCalled();
    });

    it("returns 401 for a session without a user id", async () => {
        authMock.mockResolvedValue({ user: { name: "x" } });
        const res = await PUT(put({ motion: "reduced" }));
        expect(res.status).toBe(401);
        expect((await res.json()).code).toBe("INVALID_SESSION");
    });

    it("GET returns the stored preference, defaulting to system", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        findUniqueMock.mockResolvedValueOnce({ motion: "reduced" });
        expect(await (await GET()).json()).toEqual({ preferences: { motion: "reduced" } });
        findUniqueMock.mockResolvedValueOnce(null);
        expect(await (await GET()).json()).toEqual({ preferences: { motion: "system" } });
    });

    it.each([
        ["invalid JSON", "{nope", true],
        ["an array", [], false],
        ["an empty object", {}, false],
        ["an unknown value", { motion: "turbo" }, false],
        ["a non-string value", { motion: 1 }, false],
        ["an unknown key", { motion: "full", theme: "light" }, false],
    ])("returns 400 for %s", async (_name, body, raw) => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        const res = await PUT(put(body, raw as boolean));
        expect(res.status).toBe(400);
        expect(upsertMock).not.toHaveBeenCalled();
    });

    it("persists a valid update for the session user only", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        upsertMock.mockResolvedValue({ motion: "full" });
        const res = await PUT(put({ motion: "full", userId: "someone-else" }));
        expect(res.status).toBe(400);

        const ok = await PUT(put({ motion: "full" }));
        expect(ok.status).toBe(200);
        expect(await ok.json()).toEqual({ preferences: { motion: "full" } });
        expect(upsertMock).toHaveBeenCalledWith({
            where: { userId: "u1" },
            create: { userId: "u1", motion: "full" },
            update: { motion: "full" },
            select: { motion: true },
        });
    });

    it("returns 500 when the database write fails", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        upsertMock.mockRejectedValue(new Error("db down"));
        expect((await PUT(put({ motion: "reduced" }))).status).toBe(500);
        findUniqueMock.mockRejectedValue(new Error("db down"));
        expect((await GET()).status).toBe(500);
    });
});
