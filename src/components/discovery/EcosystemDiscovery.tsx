'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search, Star, GitFork, ArrowRight } from 'lucide-react';
import { ecosystem, ecosystemCategories, type EcosystemMetrics } from '@/lib/ecosystem';
import s from './discovery.module.css';

export default function EcosystemDiscovery() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('curated');
  const [collection, setCollection] = useState('');
  const [metrics, setMetrics] = useState<EcosystemMetrics>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ecosystem', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json(); }).then(data => setMetrics(data.metrics ?? {})).catch(() => {}).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const needle = query.trim().toLowerCase();
  const results = ecosystem.filter(e => (category === 'All' || category === e.category) && (!collection || (collection === 'ship' ? ['Cloud & integrations', 'AI frameworks'].includes(e.category) : ['Agent skills', 'MCP servers', 'AI coding tools'].includes(e.category))) && `${e.name} ${e.description} ${e.tags.join(' ')} ${e.repo ?? ''}`.toLowerCase().includes(needle)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'stars' ? (metrics[b.repo ?? '']?.stars ?? -1) - (metrics[a.repo ?? '']?.stars ?? -1) : sort === 'updated' ? (Date.parse(metrics[b.repo ?? '']?.pushedAt ?? '') || 0) - (Date.parse(metrics[a.repo ?? '']?.pushedAt ?? '') || 0) : 0);
  return <section className={s.root} aria-labelledby="ecosystem-title">
    <header className={s.header}><div><h2 id="ecosystem-title">Your next <em>unfair advantage.</em></h2><p>Discover the agents, skills and infrastructure shaping how developers build.</p></div><a href="/trending#repository-catalog" className={s.repoJump}>Explore repositories <ArrowRight size={16} /></a></header>
    <div className={s.collections} aria-label="Featured collections">
      <button aria-pressed={collection === 'agent'} onClick={() => setCollection(collection === 'agent' ? '' : 'agent')}><span>THE AGENT WORKBENCH</span><strong>Code. Connect. Automate.</strong><p>Coding agents, reusable skills and MCP tools.</p><ArrowUpRight size={24} /></button>
      <button aria-pressed={collection === 'ship'} onClick={() => setCollection(collection === 'ship' ? '' : 'ship')}><span>FROM IDEA TO PRODUCTION</span><strong>Build your shipping stack.</strong><p>Frameworks and cloud tools for your next release.</p><ArrowUpRight size={24} /></button>
    </div>
    <div className={s.disclosure}><strong>Curated discovery · third-party tools</strong><span>Listings are not connected integrations or endorsements. Novaris supports GitHub repository analysis. Stars measure repository interest, not tool usage or weekly growth.</span></div>
    <div className={s.toolbar}><label className={s.search}><Search size={18} aria-hidden /><span className="sr-only">Search ecosystem</span><input type="search" placeholder="Search tools, skills, frameworks…" value={query} onChange={e => setQuery(e.target.value)} /></label><label className={s.sort}>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="curated">Editorial selection</option><option value="stars">GitHub stars</option><option value="updated">Recent repository activity</option><option value="name">Name A–Z</option></select></label></div>
    <div className={s.filters} aria-label="Ecosystem categories">{['All', ...ecosystemCategories].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div>
    <p role="status" className={s.status}>{results.length} discoveries{collection ? ' in this collection' : ''} · {loading ? 'Retrieving GitHub metrics…' : 'GitHub metrics cached hourly; unavailable counts are omitted.'}</p>
    {!results.length ? <div className={s.empty}><h3>No discoveries match</h3><p>Try a broader search or reset your filters.</p><button onClick={() => { setQuery(''); setCategory('All'); setCollection(''); }}>Reset filters</button></div> : <div>{ecosystemCategories.filter(c => results.some(e => e.category === c)).map(c => <section key={c} className={s.categorySection} data-category={c} aria-label={c}><div className={s.categoryHeading}><h3>{c}</h3><span>{results.filter(e => e.category === c).length} resources</span></div><div className={s.grid}>{results.filter(e => e.category === c).map(e => {
      const metric = e.repo ? metrics[e.repo] : undefined;
      return <article key={e.name} className={s.card} data-category={e.category}>
        <div className={s.cardTop}><Image src={`https://github.com/${e.owner}.png`} alt="" width={42} height={42} unoptimized className={s.logo} /><span>{e.category}</span></div>
        <h3><a href={e.url} target="_blank" rel="noopener noreferrer">{e.name}<ArrowUpRight size={17} aria-hidden /></a></h3><p>{e.description}</p>
        <div className={s.tags}>{e.tags.map(t => <span key={t}>{t}</span>)}</div>
        <div className={s.metrics}>{metric ? <><a href={`https://github.com/${e.repo}/stargazers`} target="_blank" rel="noopener noreferrer" title={`Fetched ${metric.fetchedAt}`}><Star size={14} />{metric.stars.toLocaleString('en-US')} stars</a><span title={`${metric.forks.toLocaleString('en-US')} forks`}><GitFork size={14} />{metric.forks.toLocaleString('en-US')}</span><span>{metric.archived ? 'Archived' : `Pushed ${metric.pushedAt.slice(0, 10)}`}</span></> : <span>{e.repo ? loading ? 'Loading repository metrics…' : 'GitHub metrics unavailable' : 'Official documentation'}</span>}</div>
        <footer><a href={e.url} target="_blank" rel="noopener noreferrer">Visit resource <ArrowUpRight size={14} /></a>{e.repo && <Link href={`/chat?q=${encodeURIComponent(e.repo)}`}>Analyze repo <ArrowRight size={14} /></Link>}</footer>
      </article>;
    })}</div></section>)}</div>}
    <div id="repository-catalog" className={s.catalogAnchor}><h2>Go deeper into the code.</h2><p>Explore GitHub repositories with Novaris, or follow the workflow guides below.</p></div>
  </section>;
}
