import { Metadata } from 'next';
import type { GitHubRepo, RepoLanguage } from '@/lib/github';
import { getErrorStatus, getRepo } from '@/lib/github';
import { cacheRepoUnavailable, getCachedRepoFullContext, getCachedRepoUnavailable } from '@/lib/cache';
import { isCuratedRepo } from '@/lib/repo-catalog';
import { GitFork, AlertCircle, Clock, FileCode, Search, Lock, Home, Github, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyBadge } from '@/components/CopyBadge';
import SiteChrome from '@/components/seo/SiteChrome';
import { Page, PageHeader, H2, btnClass } from '@/components/seo/blocks';
import { cn } from '@/components/nv/cn';
import s from './repo.module.css';
import { normalizeReadmeForPreview } from './repo-page-utils';
import { buildOgImageUrl, createSeoMetadata } from '@/lib/seo';
import { emojifyGitHubShortcodes } from '@/lib/github-emoji';

interface Props {
    params: Promise<{
        owner: string;
        repo: string;
    }>;
}

export const revalidate = 900;

const REPO_SEGMENT_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function isValidRepoSegment(value: string): boolean {
    if (!REPO_SEGMENT_PATTERN.test(value)) {
        return false;
    }

    if (value.startsWith('.') || value.endsWith('.') || value.endsWith('.git')) {
        return false;
    }

    return true;
}

function isValidOwnerRepo(owner: string, repo: string): boolean {
    return isValidRepoSegment(owner) && isValidRepoSegment(repo);
}

function buildRepoSignInHref(owner: string, repo: string): string {
    const callbackUrl = encodeURIComponent(`/repo/${owner}/${repo}`);
    return `/api/auth/signin?callbackUrl=${callbackUrl}`;
}

function RepoUnavailableState({ owner, repo }: { owner: string; repo: string }) {
    return (
        <SiteChrome>
            <Page wide>
                <PageHeader
                    crumbs={[{ label: 'Home', href: '/' }, { label: 'Repository unavailable' }]}
                    eyebrow="Repository unavailable"
                    title="We could not access this repository"
                    lead={
                        <>
                            <p>
                                Repo path: <span className={s.mono}>{owner}/{repo}</span>
                            </p>
                            <p className="mt-3">
                                The repository may not exist, may be private, or the owner/repository name may be typed incorrectly.
                                Double-check the owner and repository name. To view private repositories, sign in with GitHub first.
                            </p>
                        </>
                    }
                />
                <div className={s.actions}>
                    <Link href={buildRepoSignInHref(owner, repo)} className={btnClass('primary', true)}>
                        <Lock aria-hidden className="size-4" />
                        Sign in with GitHub
                    </Link>
                    <Link href="/" className={btnClass('secondary', true)}>
                        <Home aria-hidden className="size-4" />
                        Go to homepage
                    </Link>
                </div>
            </Page>
        </SiteChrome>
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { owner, repo } = await params;
    const valid = isValidOwnerRepo(owner, repo);
    const curated = valid ? await isCuratedRepo(owner, repo) : false;
    const knownUnavailable = valid ? await getCachedRepoUnavailable(owner, repo) : false;
    const shouldIndex = curated && !knownUnavailable;

    if (!valid) {
        return createSeoMetadata({
            title: `${owner}/${repo}`,
            description: `Analyze ${owner}/${repo} architecture, code quality, and security with Novaris Agentic CAG.`,
            canonical: `/repo/${owner}/${repo}`,
            ogImage: buildOgImageUrl("repo", { owner, repo }),
            ogTitle: `${owner}/${repo}`,
            ogDescription: `Analyze ${owner}/${repo} architecture, code quality, and security with Novaris Agentic CAG.`,
            noIndex: true,
        });
    }

    return createSeoMetadata({
        title: `${owner}/${repo}`,
        description: `Analyze ${owner}/${repo} architecture, code quality, and security with Novaris Agentic CAG.`,
        canonical: `/repo/${owner}/${repo}`,
        ogImage: buildOgImageUrl("repo", { owner, repo }),
        ogTitle: `${owner}/${repo}`,
        ogDescription: `Analyze ${owner}/${repo} architecture, code quality, and security with Novaris Agentic CAG.`,
        robots: shouldIndex
            ? { index: true, follow: true }
            : {
                index: false,
                follow: true,
                googleBot: {
                    index: false,
                    follow: true,
                },
            },
    });
}

export default async function RepoPage({ params }: Props) {
    const { owner, repo } = await params;

    if (!isValidOwnerRepo(owner, repo)) {
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    if (await getCachedRepoUnavailable(owner, repo)) {
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    let repoData: GitHubRepo;
    try {
        repoData = await getRepo(owner, repo);
    } catch (error) {
        if (getErrorStatus(error) === 404) {
            await cacheRepoUnavailable(owner, repo);
        }
        console.error('Failed repository existence check:', error);
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    const cachedContext = await getCachedRepoFullContext(owner, repo);
    const repoLanguages: RepoLanguage[] =
        cachedContext && Array.isArray(cachedContext.languages)
            ? (cachedContext.languages as RepoLanguage[])
            : [];
    const fullReadme = normalizeReadmeForPreview(
        cachedContext && typeof cachedContext.readme === "string" ? cachedContext.readme : null
    );
    const repoDescription = emojifyGitHubShortcodes(repoData.description);

    const chatBase = `/chat?q=${owner}/${repo}`;
    return (
        <SiteChrome>
            <Page wide>
                <header className="relative isolate pb-12 pt-8 md:pt-14">
                    <div aria-hidden className="nv-aurora pointer-events-none absolute inset-x-0 -top-32 bottom-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]">
                        <div className="nv-grid-paper absolute inset-0" />
                    </div>
                    <p className="nv-eyebrow mb-6">Repository</p>
                    <h1 className={cn(s.name, 'nv-display')}>
                        <span className={s.owner}>{owner} / </span>
                        <span className={s.repoName}>
                            <em>{repoData.name}</em>
                        </span>
                    </h1>
                    {repoDescription && <p className={s.desc}>{repoDescription}</p>}
                    <a href={repoData.html_url} target="_blank" rel="noopener noreferrer" className={s.gh}>
                        <Github aria-hidden className="size-4" />
                        View on GitHub
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>

                    <dl className={s.stats}>
                        <div className={s.stat}>
                            <dt>Stars</dt>
                            <dd className="nv-num">{repoData.stargazers_count.toLocaleString()}</dd>
                        </div>
                        <div className={s.stat}>
                            <dt>Forks</dt>
                            <dd className="nv-num">{repoData.forks_count.toLocaleString()}</dd>
                        </div>
                        <div className={s.stat}>
                            <dt>Open issues</dt>
                            <dd className="nv-num">{repoData.open_issues_count.toLocaleString()}</dd>
                        </div>
                        <div className={s.stat}>
                            <dt>Languages</dt>
                            <dd className={s.langs}>
                                {repoLanguages.slice(0, 3).map((lang) => (
                                    <span key={lang.name}>
                                        <span className={s.langDot} style={{ backgroundColor: lang.color ?? undefined }} />
                                        {lang.name}
                                    </span>
                                ))}
                                {repoLanguages.length === 0 && repoData.language && (
                                    <span>
                                        <span className={s.langDot} />
                                        {repoData.language}
                                    </span>
                                )}
                                {repoLanguages.length === 0 && !repoData.language && <span>Not available</span>}
                            </dd>
                        </div>
                    </dl>

                    <div className={s.actions}>
                        <Link href={chatBase} className={btnClass('primary', true)}>
                            <FileCode aria-hidden className="size-4" />
                            Chat with Codebase
                        </Link>
                        <Link href={`${chatBase}&prompt=architecture`} className={btnClass('secondary', true)}>
                            <GitFork aria-hidden className="size-4" />
                            Architecture Scan
                        </Link>
                        <Link href={`${chatBase}&prompt=security`} className={btnClass('secondary', true)}>
                            <AlertCircle aria-hidden className="size-4" />
                            Security Audit
                        </Link>
                        <Link href={`${chatBase}&prompt=explain`} className={btnClass('secondary', true)}>
                            <Search aria-hidden className="size-4" />
                            Explain Codebase
                        </Link>
                    </div>
                </header>

                <section aria-labelledby="repo-ai-h" className={cn(s.section, 'grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12')}>
                    <div className="lg:col-span-5">
                        <H2 id="repo-ai-h">AI architecture analysis</H2>
                    </div>
                    <div className="lg:col-span-7">
                        <div className="max-w-[var(--nv-measure)] space-y-4 text-[1.0625rem] leading-relaxed text-nv-ivory-200">
                            <p>
                                This repository is indexed by Novaris. By analyzing <strong className="font-semibold text-nv-ivory-50">{owner}/{repo}</strong> in the
                                workspace, you can generate architecture diagrams, trace control flows, and run security audits across the codebase.
                            </p>
                            <p>
                                Agentic Context Augmented Generation (Agentic CAG) loads full source files into context on demand, avoiding the fragmentation of
                                traditional RAG. Ask about the architecture, dependencies, or specific features to see it in action.
                            </p>
                        </div>
                        <p className={cn(s.note, 'mt-6')}>
                            <Clock aria-hidden className="size-3.5" />
                            Source files are only loaded when you start an analysis.
                        </p>
                        <div className="mt-6">
                            <Link href={chatBase} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-nv-copper-400 hover:text-nv-copper-300">
                                Launch the interactive analysis workspace <ArrowUpRight aria-hidden className="size-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                <div className={s.section}>
                    <CopyBadge owner={owner} repo={repo} />
                </div>

                {fullReadme && (
                    <section aria-labelledby="repo-readme-h" className={s.section}>
                        <div className="mb-6 flex items-center justify-between gap-4 border-b border-nv-graphite-700 pb-3">
                            <h2 id="repo-readme-h" className="nv-eyebrow">
                                Repository summary (README)
                            </h2>
                            <span className="nv-eyebrow">Preview</span>
                        </div>
                        <div className={s.readme}>
                            <div className="prose max-w-none [--tw-prose-body:var(--nv-ivory-200)] [--tw-prose-headings:var(--nv-ivory-50)] [--tw-prose-links:var(--nv-copper-400)] [--tw-prose-bold:var(--nv-ivory-50)] [--tw-prose-code:var(--nv-ivory-100)] prose-img:m-0 prose-img:mr-1 prose-img:inline prose-img:align-middle prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                                    {fullReadme}
                                </ReactMarkdown>
                            </div>
                            <div aria-hidden className={s.readmeFade} />
                        </div>
                    </section>
                )}
            </Page>
        </SiteChrome>
    );
}
