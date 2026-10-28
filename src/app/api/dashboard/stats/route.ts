import { auth } from "@/lib/auth";
import { getUserScans } from "@/lib/services/scan-storage";
import { NextResponse } from "next/server";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

export async function GET() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authState === "invalid") {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    const userId = getSessionUserId(session);
    if (!userId) {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    try {
        const scans = await getUserScans(userId);

        // Findings come from the latest scan of each repository, so rescanning does not double-count.
        const latestByRepo = new Map<string, (typeof scans)[number]>();
        let deepScans = 0;

        for (const scan of scans) {
            const key = `${scan.owner}/${scan.repo}`.toLowerCase();
            const current = latestByRepo.get(key);
            if (!current || Number(scan.timestamp) > Number(current.timestamp)) latestByRepo.set(key, scan);
            if (scan.depth === 'deep') {
                deepScans += 1;
            }
        }
        const reposScanned = latestByRepo;
        let issuesFound = 0;
        for (const scan of latestByRepo.values()) issuesFound += scan.summary.total || 0;

        return NextResponse.json({
            stats: {
                reposScanned: reposScanned.size,
                issuesFound,
                deepScans
            }
        });
    } catch {
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
