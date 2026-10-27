/** Most file paths one chat request may carry; the server rejects more (see request-validation). */
export const MAX_FILE_PATHS = 5000;

const LOW_PRIORITY = /(^|\/)(tests?|__tests__|specs?|fixtures?|examples?|e2e|bench(marks?)?|docs?|test-results|snapshots?|__snapshots__)\/|\.(test|spec)\.[a-z]+$/i;

/**
 * Picks the file paths sent with a repository question. Large repositories exceed the request limit,
 * so the list is trimmed: tagged files first, then source and config before tests/examples/docs,
 * shallower paths before deeper ones. Order is stable within each tier.
 */
export function selectRequestFilePaths<T extends { path: string }>(files: T[], mustInclude: string[] = [], max = MAX_FILE_PATHS): T[] {
  if (files.length <= max) return files;
  const must = new Set(mustInclude);
  const ranked = files
    .map((file, index) => ({
      file,
      index,
      tier: must.has(file.path) ? 0 : LOW_PRIORITY.test(file.path) ? 2 : 1,
      depth: file.path.split("/").length,
    }))
    .sort((a, b) => a.tier - b.tier || a.depth - b.depth || a.index - b.index);
  return ranked.slice(0, max).map((r) => r.file);
}
