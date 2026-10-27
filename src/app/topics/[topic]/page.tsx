import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { cn } from '@/components/nv/cn';
import s from '@/components/seo/seo.module.css';
import SiteChrome from '@/components/seo/SiteChrome';
import { Page, PageHeader, LinkRow } from '@/components/seo/blocks';
import { TopicMap, type TopicLanguage, type TopicLink } from '@/components/experiences/topics/TopicMap';
import { getIndexableTopics, getReposForTopic, isIndexableTopic } from '@/lib/repo-catalog';
import { buildOgImageUrl, createSeoMetadata, truncateMetaText } from '@/lib/seo';

interface Props {
    params: Promise<{
        topic: string;
    }>;
}

export const revalidate = 604800;
export const dynamicParams = false;

export async function generateStaticParams() {
    const topics = await getIndexableTopics();
    return topics.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { topic } = await params;
    const topicSlug = decodeURIComponent(topic);
    const displayTopic = topicSlug.replace(/-/g, ' ');
    const capitalizedTopic = displayTopic.charAt(0).toUpperCase() + displayTopic.slice(1);
    const indexable = await isIndexableTopic(topicSlug);
    const repos = await getReposForTopic(topicSlug);
    const topRepo = repos[0];
    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);

    return createSeoMetadata({
        title: `Best Open Source ${capitalizedTopic} Repositories`,
        description: `Discover and analyze the top open-source GitHub repositories for ${displayTopic}. Deep architecture and code analysis powered by Novaris.`,
        canonical: `/topics/${topic}`,
        ogImage: buildOgImageUrl("topic", {
            topic: displayTopic,
            description: truncateMetaText(`Explore the best open-source projects using ${displayTopic}.`, 170),
            repos: repos.length,
            stars: totalStars,
            topRepo: topRepo ? `${topRepo.owner}/${topRepo.repo}` : undefined,
        }),
        ogTitle: `Top ${capitalizedTopic} repositories`,
        ogDescription: `Explore the best open-source projects using ${displayTopic}.`,
        robots: indexable
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

export default async function TopicPage({ params }: Props) {
    const { topic } = await params;
    const decodedTopic = decodeURIComponent(topic);
    const displayTopic = decodedTopic.replace(/-/g, ' ');

    const [repos, indexable] = await Promise.all([getReposForTopic(decodedTopic), getIndexableTopics()]);

    if (!repos || repos.length === 0) {
        notFound();
    }

    const langCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    for (const repo of repos) {
        if (repo.language) langCounts.set(repo.language, (langCounts.get(repo.language) ?? 0) + 1);
        for (const tag of new Set(repo.topics)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const languages: TopicLanguage[] = [...langCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const indexableSet = new Set(indexable);
    const related: TopicLink[] = [...tagCounts]
        .filter(([tag]) => tag !== decodedTopic.toLowerCase() && indexableSet.has(tag))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 6)
        .map(([tag]) => ({ slug: tag, label: tag.replace(/-/g, ' ') }));
    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);

    return (
        <SiteChrome current="/trending">
            <Page wide>
                <PageHeader
                    crumbs={[{ label: 'Home', href: '/' }, { label: 'Trending', href: '/trending' }, { label: displayTopic }]}
                    eyebrow="Topic"
                    title={`Open source repositories tagged ${displayTopic}`}
                    lead={`Repositories in the Novaris catalog tagged ${displayTopic}, ordered by stars at the last catalog refresh. Open one to see its public GitHub data.`}
                />
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-16">
                    <div className="min-w-0">
                        <ol className={cn(s.rows, "m-0 list-none p-0")}>
                            {repos.map((repo, index) => (
                                <li key={`${repo.owner}/${repo.repo}`}>
                                    <LinkRow
                                        href={`/repo/${repo.owner}/${repo.repo}`}
                                        title={`${index + 1}. ${repo.owner}/${repo.repo}`}
                                        summary={repo.description ?? undefined}
                                        meta={`${repo.language ? `${repo.language} · ` : ''}${repo.stars.toLocaleString()} stars`}
                                    />
                                </li>
                            ))}
                        </ol>
                        <p className="mt-6 flex items-center gap-1.5 text-nv-micro text-nv-ivory-300">
                            <Star aria-hidden className="size-3" /> Star counts are from the catalog, not live GitHub.
                        </p>
                    </div>
                    <div className="lg:sticky lg:top-28 lg:self-start">
                        <TopicMap topic={displayTopic} repoCount={repos.length} totalStars={totalStars} languages={languages} related={related} />
                    </div>
                </div>
            </Page>
        </SiteChrome>
    );
}
