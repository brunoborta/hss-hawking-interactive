import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PoiPopup } from './PoiPopup';

describe('PoiPopup', () => {
  it('shows fallback name, category, zone, description, variant, modes and media', () => {
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
          media: { src: 'media/weapon-production-01.webp', alt: 'Shotgun' },
        }}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Weapon — Production');
    expect(screen.getByText('Behind the crates.')).toBeInTheDocument();
    expect(screen.getByText(/shotgun/)).toBeInTheDocument();
    expect(screen.getByText(/Modes: Kill the Specimen/)).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Shotgun' });
    expect(img).toHaveAttribute('src', expect.stringContaining('media/weapon-production-01.webp'));
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
