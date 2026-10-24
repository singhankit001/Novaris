"use client";

import { Dialog } from "@/components/nv/dialog";
import { Badge } from "@/components/nv/badge";

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Static release notes. The newest entry is first.
const versions = [
    {
        version: "v2.0",
        isNew: true,
        features: [
            "Authentication: Secure sign-in with GitHub to persist your data.",
            "Personal Dashboard: Track your recent repositories, searches, and analysis in one place.",
            "Cloud Sync: Access your chat history and saved projects from any device.",
            "Performance: faster repository indexing and chat responses."
        ]
    },
    {
        version: "v1.3.4",
        isNew: false,
        features: [
            "Chat Export: Export chats to Markdown with Mermaid rendering.",
            "Copy Response: One-click copy for AI responses with enhanced clipboard support and icon updates.",
            "Chat UX: Reference text handling, selection support, and refined chat input/profile chat interfaces.",
            "File Preview: Refactored base64 decoding logic for readability."
        ]
    },
    {
        version: "v1.3.3",
        isNew: false,
        features: [
            "Markdown Support: User input contained between three backticks is now treated as markdown.",
            "PWA Support: Full Progressive Web App support is now available.",
            "GitHub Link: GitHub repository link is now implemented on the webpage."
        ]
    },
    {
        version: "v1.3.2",
        isNew: false,
        features: [
            "Speed: faster profile loads and file selection with Flash-Lite.",
            "Web Search: Real-time answers for competitors, news, and jobs.",
            "Smart URLs: LinkedIn summarization and identity verification."
        ]
    },
    {
        version: "v1.3.1",
        isNew: false,
        features: [
            "Improved handling of complex flowchart generation",
            "Improved error handling: Mermaid syntax errors are now hidden from the UI",
            "Added context for better chat results"
        ]
    },
    {
        version: "v1.3",
        isNew: false,
        features: [
            "Introduced the codeblocks in chat UI for code display with horizontal scrolling",
            "Integrated an enhanced flowchart diagrams.",
            "Added hidden files section to optimise the repo tree.",
            "Implemented the devtools",
            "Added realtime next js server response",
            "Introduced the Vercel KV caching for GitHub API calls",
            "Robust mermaid diagram fix pipeline using JSON by LLM to mermaid by typescript."
        ]
    },
    {
        version: "v1.2",
        isNew: false,
        features: [
            "Dev Tools Suite: Advanced Search (Regex/AST), Code Quality Analysis, and Automated Generators.",
            "Security: vulnerability scanning using pattern matching and Gemini.",
            "Enhanced Data: Precise language statistics via GraphQL and commit history.",
            "Auto-Persistence: Conversations are now automatically saved locally and restored instantly."
        ]
    },
    {
        version: "v1.1",
        isNew: false,
        features: [
            "Caching: faster loads for previously visited profiles and repositories.",
            "Mobile Experience: Optimized layout for mobile devices.",
            "Repo Chat: Deep dive into repositories with AI-powered chat and file analysis.",
            "File Preview: syntax-highlighted previews for files in the repository."
        ]
    }
];

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
    return (
        <Dialog open={isOpen} onClose={onClose} title="What's new" description="Release notes, newest first.">
            <div className="flex flex-col gap-8">
                {versions.map((version) => (
                    <section key={version.version} aria-labelledby={`wn-${version.version}`}>
                        <div className="mb-3 flex items-center gap-3">
                            <h3 id={`wn-${version.version}`} className="nv-num font-mono text-nv-body font-medium text-nv-ivory-50">
                                {version.version}
                            </h3>
                            {version.isNew && <Badge status="info">Latest</Badge>}
                        </div>
                        <ul className="m-0 list-disc space-y-2 pl-5 text-nv-small text-nv-ivory-200 marker:text-nv-graphite-500">
                            {version.features.map((feature) => (
                                <li key={feature}>{feature}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </Dialog>
    );
}
