import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
import { GET } from './route';
import { ecosystem } from '@/lib/ecosystem';
afterEach(() => vi.unstubAllGlobals());
describe('ecosystem GitHub metrics', () => {
 it('returns upstream statistics with provenance and bounds concurrency', async () => {
   let active = 0; let peak = 0;
   const fetcher = vi.fn(async () => { active++; peak = Math.max(peak, active); await Promise.resolve(); active--; return Response.json({ stargazers_count: 1234, forks_count: 21, pushed_at: '2026-10-20T00:00:00Z', archived: false }); });
   vi.stubGlobal('fetch', fetcher);
   const data = await (await GET()).json();
   expect(data.metrics['openai/codex']).toMatchObject({ stars: 1234, forks: 21, archived: false });
   expect(Date.parse(data.metrics['openai/codex'].fetchedAt)).not.toBeNaN();
   expect(peak).toBeLessThanOrEqual(3);
   expect(fetcher).toHaveBeenCalledTimes(new Set(ecosystem.flatMap(e => e.repo ? [e.repo] : [])).size);
 });
 it('omits unavailable metrics rather than manufacturing counts', async () => {
   vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
   expect((await (await GET()).json()).metrics).toEqual({});
 });
 it('tolerates network errors and malformed payloads', async () => {
   vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
   expect((await (await GET()).json()).metrics).toEqual({});
   vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({})));
   expect((await (await GET()).json()).metrics).toEqual({});
 });
});
