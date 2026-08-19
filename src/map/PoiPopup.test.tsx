import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:poi-images', () => ({ poiImageIds: ['weapon-production-01'] }));

import { PoiPopup } from './PoiPopup';

describe('PoiPopup', () => {
  it('shows fallback name, category, zone, description, variant, modes and image', () => {
    render(
      <PoiPopup
        poi={{
          id: 'weapon-production-01',
          category: 'weapon',
          zone: 'production',
          x: 1,
          y: 2,
          description: 'Behind the crates.',
          variant: 'shotgun',
          gameModes: ['kill-the-specimen'],
        }}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Weapon — Production');
    expect(screen.getByText('Behind the crates.')).toBeInTheDocument();
    expect(screen.getByText(/shotgun/)).toBeInTheDocument();
    expect(screen.getByText(/Modes: Kill the Specimen/)).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Weapon — Production' });
    expect(img).toHaveAttribute('src', expect.stringContaining('media/pics/weapon-production-01.png'));
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders no image for a POI without one (not an error)', () => {
    render(<PoiPopup poi={{ id: 'weapon-production-02', category: 'weapon', zone: 'production', x: 1, y: 2 }} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
