import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Poi } from '../data/schema';

vi.mock('virtual:poi-images', () => ({ poiImageIds: ['ammo-hub-01'] }));

import { PoiImage } from './PoiImage';

const withImage: Poi = { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 1, y: 2 };
const without: Poi = { id: 'ammo-hub-02', category: 'ammo', zone: 'hub', x: 1, y: 2 };

describe('PoiImage', () => {
  it('renders the conventional image when one exists', () => {
    render(<PoiImage poi={withImage} className="c" />);
    const img = screen.getByRole('img', { name: 'Ammunition — Central Hub' });
    expect(img).toHaveAttribute('src', expect.stringContaining('media/pics/ammo-hub-01.png'));
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('c');
  });

  it('renders the fallback (default: nothing) when there is no image', () => {
    const { container, rerender } = render(<PoiImage poi={without} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PoiImage poi={without} fallback={<span>no image</span>} />);
    expect(screen.getByText('no image')).toBeInTheDocument();
  });

  it('falls back if the image fails to load', () => {
    render(<PoiImage poi={withImage} fallback={<span>no image</span>} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('no image')).toBeInTheDocument();
  });
});
