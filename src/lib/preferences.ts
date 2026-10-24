import { prisma } from "@/lib/db";

export const MOTION_VALUES = ["system", "reduced", "full"] as const;
export type MotionPreference = (typeof MOTION_VALUES)[number];

export interface Preferences {
    motion: MotionPreference;
}

export const DEFAULT_PREFERENCES: Preferences = { motion: "system" };

export function isMotionPreference(value: unknown): value is MotionPreference {
    return typeof value === "string" && (MOTION_VALUES as readonly string[]).includes(value);
}

/**
 * Validates an untrusted PUT body. Unknown keys are rejected so a typo cannot silently succeed.
 * Returns a partial update or an error message for the 400 response.
 */
export function parsePreferencesUpdate(body: unknown): { ok: true; value: Partial<Preferences> } | { ok: false; error: string } {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return { ok: false, error: "Body must be a JSON object." };
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    if (keys.length === 0) return { ok: false, error: "No preferences provided." };
    const unknown = keys.filter((key) => key !== "motion");
    if (unknown.length > 0) return { ok: false, error: `Unknown preference: ${unknown[0]}` };
    if (!isMotionPreference(input.motion)) {
        return { ok: false, error: `motion must be one of: ${MOTION_VALUES.join(", ")}.` };
    }
    return { ok: true, value: { motion: input.motion } };
}

export async function getPreferences(userId: string): Promise<Preferences> {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: { motion: true } });
    return { motion: isMotionPreference(row?.motion) ? row.motion : DEFAULT_PREFERENCES.motion };
}

export async function savePreferences(userId: string, update: Partial<Preferences>): Promise<Preferences> {
    const row = await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, ...update },
        update,
        select: { motion: true },
    });
    return { motion: isMotionPreference(row.motion) ? row.motion : DEFAULT_PREFERENCES.motion };
}
