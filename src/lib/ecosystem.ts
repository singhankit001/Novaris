/** Editorial descriptions link directly to the publisher; GitHub metrics are fetched separately. */
export const ecosystemCategories = ['AI coding tools', 'Cloud & integrations', 'Agent skills', 'MCP servers', 'AI frameworks'] as const;
export type EcosystemCategory = typeof ecosystemCategories[number];
export interface EcosystemEntry { name: string; category: EcosystemCategory; description: string; url: string; repo?: string; owner: string; tags: string[] }
const entry = (name: string, category: EcosystemCategory, description: string, url: string, owner: string, repo: string | undefined, tags: string[]): EcosystemEntry => ({ name, category, description, url, owner, repo, tags });
export const ecosystem: EcosystemEntry[] = [
 entry('Claude Code', 'AI coding tools', 'Anthropic’s agentic coding tool for working with your codebase.', 'https://code.claude.com/docs/en/overview', 'anthropics', 'anthropics/claude-code', ['terminal', 'coding']),
 entry('Cursor', 'AI coding tools', 'An AI code editor with agent workflows and codebase context.', 'https://cursor.com/docs', 'cursor', undefined, ['editor', 'coding']),
 entry('Codex', 'AI coding tools', 'OpenAI’s coding agent, with an open-source terminal client.', 'https://github.com/openai/codex', 'openai', 'openai/codex', ['terminal', 'coding']),
 entry('Gemini CLI', 'AI coding tools', 'Google’s open-source agent for the terminal.', 'https://github.com/google-gemini/gemini-cli', 'google-gemini', 'google-gemini/gemini-cli', ['terminal', 'coding']),
 entry('OpenCode', 'AI coding tools', 'An open-source coding agent with support for multiple model providers.', 'https://opencode.ai/docs', 'anomalyco', 'anomalyco/opencode', ['terminal', 'open source']),
 entry('Aider', 'AI coding tools', 'AI pair programming in your terminal, alongside your Git workflow.', 'https://aider.chat/docs/', 'Aider-AI', 'Aider-AI/aider', ['terminal', 'git']),
 entry('GitHub', 'Cloud & integrations', 'Repositories, pull requests, issues and developer collaboration.', 'https://docs.github.com', 'github', undefined, ['git', 'collaboration']),
 entry('Vercel', 'Cloud & integrations', 'Deployment infrastructure and workflows for web applications.', 'https://vercel.com/docs', 'vercel', 'vercel/vercel', ['deployment', 'web']),
 entry('Supabase', 'Cloud & integrations', 'A Postgres development platform with authentication and storage.', 'https://supabase.com/docs', 'supabase', 'supabase/supabase', ['database', 'postgres']),
 entry('Cloudflare', 'Cloud & integrations', 'Build and deploy applications on Workers and the developer platform.', 'https://developers.cloudflare.com', 'cloudflare', 'cloudflare/workers-sdk', ['deployment', 'edge']),
 entry('AWS', 'Cloud & integrations', 'Cloud services and SDKs for application infrastructure.', 'https://docs.aws.amazon.com', 'aws', undefined, ['cloud', 'infrastructure']),
 entry('Docker', 'Cloud & integrations', 'Container tooling for reproducible development and delivery.', 'https://docs.docker.com', 'docker', 'docker/cli', ['containers', 'devops']),
 entry('Anthropic Skills', 'Agent skills', 'Publisher-maintained skills for documents, design and development workflows.', 'https://github.com/anthropics/skills', 'anthropics', 'anthropics/skills', ['claude code', 'SKILL.md']),
 entry('Vercel Agent Skills', 'Agent skills', 'Reusable skills for React, web design and deployment workflows.', 'https://github.com/vercel-labs/agent-skills', 'vercel', 'vercel-labs/agent-skills', ['react', 'performance']),
 entry('Agent Skills specification', 'Agent skills', 'The open format for portable instructions and resources for agents.', 'https://agentskills.io', 'agentskills', 'agentskills/agentskills', ['standard', 'SKILL.md']),
 entry('GitHub MCP Server', 'MCP servers', 'GitHub’s official server for repository and collaboration workflows.', 'https://github.com/github/github-mcp-server', 'github', 'github/github-mcp-server', ['git', 'issues']),
 entry('Playwright MCP', 'MCP servers', 'Browser automation tools exposed through the Model Context Protocol.', 'https://github.com/microsoft/playwright-mcp', 'microsoft', 'microsoft/playwright-mcp', ['browser', 'testing']),
 entry('Supabase MCP', 'MCP servers', 'Connect AI tools to Supabase through its maintained MCP server.', 'https://github.com/supabase-community/supabase-mcp', 'supabase', 'supabase-community/supabase-mcp', ['database', 'postgres']),
 entry('MCP reference servers', 'MCP servers', 'Reference implementations for learning and building MCP integrations.', 'https://github.com/modelcontextprotocol/servers', 'modelcontextprotocol', 'modelcontextprotocol/servers', ['filesystem', 'protocol']),
 entry('LangGraph', 'AI frameworks', 'Build stateful agent workflows with explicit orchestration.', 'https://github.com/langchain-ai/langgraph', 'langchain-ai', 'langchain-ai/langgraph', ['agents', 'python']),
 entry('Vercel AI SDK', 'AI frameworks', 'A TypeScript toolkit for building AI applications and agents.', 'https://ai-sdk.dev/docs', 'vercel', 'vercel/ai', ['typescript', 'agents']),
 entry('n8n', 'AI frameworks', 'Workflow automation with integrations and AI workflow building blocks.', 'https://docs.n8n.io', 'n8n-io', 'n8n-io/n8n', ['automation', 'workflows']),
 entry('Dify', 'AI frameworks', 'An open-source platform for building LLM application workflows.', 'https://docs.dify.ai', 'langgenius', 'langgenius/dify', ['workflows', 'LLM']),
];
export interface EcosystemMetric { stars: number; forks: number; pushedAt: string; fetchedAt: string; archived: boolean; }
export type EcosystemMetrics = Record<string, EcosystemMetric>;
