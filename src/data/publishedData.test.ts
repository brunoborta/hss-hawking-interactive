import { describe, expect, it } from 'vitest';
import raw from './hawking-map.json';
import { safeParseMapData } from './schema';

describe('hawking-map.json', () => {
  it('conforms to the schema', () => {
    const r = safeParseMapData(raw);
    if (!r.ok) throw new Error(r.errors.join('\n'));
    expect(r.ok).toBe(true);
  });
});
