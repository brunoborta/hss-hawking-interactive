import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../map/MapView', () => ({ MapView: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div> }));
vi.mock('../map/MarkerLayer', () => ({ MarkerLayer: () => null }));

import { App } from './App';

describe('App', () => {
  it('renders map and legend', () => {
    render(<App />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
  });
});
