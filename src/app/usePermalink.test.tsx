import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Poi } from '../data/schema';
import { usePermalink } from './usePermalink';

const pois: Poi[] = [{ id: 'healing-hub-01', category: 'healing', zone: 'hub', x: 1, y: 1 }];

describe('usePermalink', () => {
  it('opens the poi from the hash once and clears the target after the popup opened', async () => {
    window.location.hash = '#poi/healing-hub-01';
    const setVisible = vi.fn();
    const { result } = renderHook(() => usePermalink({ pois, setVisible }));
    expect(result.current.openPoiId).toBe('healing-hub-01');
    expect(setVisible).toHaveBeenCalled();
    await act(async () => {
      result.current.onPopupOpen('healing-hub-01');
    });
    await waitFor(() => {
      expect(result.current.openPoiId).toBeNull();
    }, { timeout: 100 });
    expect(window.location.hash).toBe('#poi/healing-hub-01');
    window.location.hash = '';
  });

  it('cat hash solos the category and sets no poi', () => {
    window.location.hash = '#cat/ammo';
    const setVisible = vi.fn();
    const { result } = renderHook(() => usePermalink({ pois, setVisible }));
    expect(result.current.openPoiId).toBeNull();
    const set = setVisible.mock.calls.at(-1)?.[0] as Set<string>;
    expect([...set]).toEqual(['ammo']);
    window.location.hash = '';
  });
});
