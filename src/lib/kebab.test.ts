import { describe, expect, it } from 'vitest';
import { kebab } from './kebab';

describe('kebab', () => {
  it('normalises', () => {
    expect(kebab('Shot Gun')).toBe('shot-gun');
    expect(kebab('  Hard__Core ')).toBe('hard-core');
    expect(kebab('a--b')).toBe('a-b');
    expect(kebab('-x-')).toBe('x');
    expect(kebab('Ünïcode!')).toBe('ncode');
  });
});
