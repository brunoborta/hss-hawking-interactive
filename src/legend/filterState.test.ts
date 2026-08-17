import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../data/categories';
import { allVisible, isAllVisible, noneVisible, soloCategory, toggleCategory } from './filterState';

describe('filterState', () => {
  it('allVisible contains every category', () => {
    expect([...allVisible()].sort()).toEqual([...CATEGORY_IDS].sort());
    expect(isAllVisible(allVisible())).toBe(true);
  });
  it('noneVisible is empty', () => {
    expect(noneVisible().size).toBe(0);
    expect(isAllVisible(noneVisible())).toBe(false);
  });
  it('toggle removes then re-adds without mutating input', () => {
    const a = allVisible();
    const b = toggleCategory(a, 'ammo');
    expect(b.has('ammo')).toBe(false);
    expect(a.has('ammo')).toBe(true);
    expect(toggleCategory(b, 'ammo').has('ammo')).toBe(true);
  });
  it('solo yields exactly one category', () => {
    expect([...soloCategory('weapon')]).toEqual(['weapon']);
  });
});
