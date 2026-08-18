import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../data/categories';
import { ICON_SVG } from './index';
import { CategoryIcon } from './CategoryIcon';

describe('icons', () => {
  it('has an svg string for every category', () => {
    for (const id of CATEGORY_IDS) {
      expect(ICON_SVG[id]).toMatch(/^<svg[\s\S]*<\/svg>$/);
      expect(ICON_SVG[id]).toContain('viewBox="0 0 24 24"');
    }
  });
  it('CategoryIcon renders an svg with the requested size', () => {
    const { container } = render(<CategoryIcon category="healing" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('40');
  });
});
