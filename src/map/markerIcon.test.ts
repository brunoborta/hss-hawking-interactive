import { describe, expect, it } from 'vitest';
import { markerIcon } from './markerIcon';

describe('markerIcon', () => {
  it('builds a divIcon with the category svg and 32px anchor at centre', () => {
    const icon = markerIcon('healing', false);
    const opts = icon.options;
    expect(String(opts.html)).toContain('<svg');
    expect(opts.iconSize).toEqual([32, 32]);
    expect(opts.iconAnchor).toEqual([16, 16]);
    expect(opts.className).toContain('poi-marker');
    expect(opts.className).not.toContain('is-selected');
  });
  it('adds is-selected when selected', () => {
    expect(markerIcon('ammo', true).options.className).toContain('is-selected');
  });
});
