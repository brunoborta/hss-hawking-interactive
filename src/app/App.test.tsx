import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../map/MapView', () => ({ MapView: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div> }));
vi.mock('../map/MarkerLayer', () => ({ MarkerLayer: () => null }));
vi.mock('../map/ReferenceLayer', () => ({ ReferenceLayer: () => null }));

import { App } from './App';

describe('App', () => {
  it('renders map and legend', () => {
    render(<App />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
  });

  it('renders the editor when ?edit is present', async () => {
    window.history.pushState({}, '', '/?edit');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /editor/i })).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });
});
