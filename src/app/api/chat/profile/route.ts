import { NextRequest, NextResponse } from "next/server";
import { processProfileQueryStream } from "@/app/actions";
import { BODY_LIMIT_PROFILE_CHAT, validateProfileChatBody } from "@/lib/request-validation";
import { handleChatRequest } from "../_shared";

export async function POST(req: NextRequest) {
    return handleChatRequest(req, {
        scope: "profile",
        label: "Profile chat",
        bodyLimit: BODY_LIMIT_PROFILE_CHAT,
        validate: validateProfileChatBody,
        // Cross-repo analysis is a signed-in feature; enforced here, not in the UI.
        gate: (input, userId) =>
            input.crossRepoEnabled && !userId
                ? NextResponse.json(
                      { error: "Login required for cross-repo analysis.", code: "LOGIN_REQUIRED_CROSS_REPO" },
                      { status: 401 }
                  )
                : null,
        logContext: (input) => ({ username: input.profileContext.username }),
        generate: (input, ctx) =>
            processProfileQueryStream(
                input.query,
                input.profileContext as unknown as Parameters<typeof processProfileQueryStream>[1],
                ctx.modelPreference,
                {
                    cacheAudience: ctx.audience,
                    cacheActorId: ctx.actorId,
                    crossRepoEnabled: input.crossRepoEnabled,
                    history: input.history,
                    disableToolCalls: ctx.disableToolCalls,
                }
            ),
    });
}
