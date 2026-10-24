import { NextRequest } from "next/server";
import { generateAnswerStream } from "@/app/actions";
import { BODY_LIMIT_REPO_CHAT, validateRepoChatBody } from "@/lib/request-validation";
import { handleChatRequest } from "../_shared";

export async function POST(req: NextRequest) {
    return handleChatRequest(req, {
        scope: "repo",
        label: "Repo chat",
        bodyLimit: BODY_LIMIT_REPO_CHAT,
        validate: validateRepoChatBody,
        logContext: (input) => ({ owner: input.repoDetails.owner, repo: input.repoDetails.repo }),
        generate: (input, ctx) =>
            generateAnswerStream(
                input.query,
                input.repoDetails,
                input.filePaths,
                input.fileShas,
                ctx.audience,
                ctx.actorId,
                input.history,
                input.profileData as Parameters<typeof generateAnswerStream>[7],
                ctx.modelPreference,
                ctx.disableToolCalls
            ),
    });
}
