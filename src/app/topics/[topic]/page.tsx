import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import SiteChrome from '@/components/seo/SiteChrome';
import { Page, PageHeader, LinkRow } from '@/components/seo/blocks';
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

    const repos = await getReposForTopic(decodedTopic);

    if (!repos || repos.length === 0) {
        notFound();
    }

    return (
        <SiteChrome current="/trending">
            <Page wide>
                <PageHeader
                    crumbs={[{ label: 'Home', href: '/' }, { label: 'Trending', href: '/trending' }, { label: displayTopic }]}
                    eyebrow="Topic"
                    title={`Open source repositories tagged ${displayTopic}`}
                    lead={`Repositories in the Novaris catalog tagged ${displayTopic}, ordered by stars at the last catalog refresh. Open one to see its public GitHub data.`}
                />
                <ol className="m-0 list-none border-t border-nv-graphite-700 p-0">
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
                <p className="mt-4 flex items-center gap-1.5 text-nv-micro text-nv-ivory-300">
                    <Star aria-hidden className="size-3" /> Star counts are from the catalog, not live GitHub.
                </p>
            </Page>
        </SiteChrome>
    );
}
