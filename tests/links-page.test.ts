import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const scriptPath = new URL('../src/scripts/links-page.ts', import.meta.url);

describe('links page tag filtering', () => {
  it('reapplies cached latency data after rebuilding filtered cards', async () => {
    const source = await readFile(scriptPath, 'utf8');

    expect(source).toMatch(/const handleTagClick[\s\S]*?renderGroups\(\);[\s\S]*?if \(latencyPayload !== null\) applyLatency\(latencyPayload\);/);
    expect(source).toContain('root.dataset.linksSourceUrl || LINKS_SOURCE_URL');
    expect(source).toContain('root.dataset.latencySourceUrl || LATENCY_SOURCE_URL');
    expect(source).toContain('root.dataset.tombstoneSourceUrl || TOMBSTONE_SOURCE_URL');
  });
});
