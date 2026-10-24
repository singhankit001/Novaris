import { NextRequest, NextResponse } from 'next/server';
import { fixMermaidSyntax } from '@/lib/gemini';
import { getAnonymousNetworkId } from '@/lib/actor-id';
import { enforceRateLimit, RATE_LIMIT_FIX_MERMAID } from '@/lib/rate-limit';

// Diagrams are small; anything larger is not a diagram the model should be asked to repair.
const MAX_CODE_LENGTH = 20_000;
const MAX_SYNTAX_ERROR_LENGTH = 2_000;
const MAX_DIAGRAM_TYPE_LENGTH = 64;

export async function POST(req: NextRequest) {
    // Unauthenticated Gemini-spending route: limit by network identity.
    const limited = await enforceRateLimit(req.headers, getAnonymousNetworkId(req.headers), RATE_LIMIT_FIX_MERMAID);
    if (limited) return limited;
    try {
        const payload = await req.json() as {
            code?: unknown;
            syntaxError?: unknown;
            diagramType?: unknown;
        };
        const code = typeof payload.code === "string" ? payload.code : "";

        if (!code) {
            return NextResponse.json(
                { error: 'Missing code parameter' },
                { status: 400 }
            );
        }

        const syntaxError = typeof payload.syntaxError === "string" ? payload.syntaxError : undefined;
        const diagramType = typeof payload.diagramType === "string" ? payload.diagramType : undefined;
        if (
            code.length > MAX_CODE_LENGTH ||
            (syntaxError?.length ?? 0) > MAX_SYNTAX_ERROR_LENGTH ||
            (diagramType?.length ?? 0) > MAX_DIAGRAM_TYPE_LENGTH
        ) {
            return NextResponse.json({ error: 'Diagram is too large to repair' }, { status: 413 });
        }

        const fixed = await fixMermaidSyntax(code, { syntaxError, diagramType });

        if (!fixed) {
            return NextResponse.json(
                { error: 'Failed to fix Mermaid syntax' },
                { status: 500 }
            );
        }

        return NextResponse.json({ fixed });
    } catch (error: unknown) {
        console.error('Error fixing Mermaid syntax:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
