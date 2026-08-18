import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Poi } from '../data/schema';
import { Inspector } from './Inspector';

const poi = { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 } as const;

function LiveInspector({ initial }: { initial: Poi }) {
  const [poi, setPoi] = useState<Poi>(initial);
  return <Inspector poi={poi} onChange={(patch) => setPoi((p) => ({ ...p, ...patch }) as Poi)} />;
}

describe('Inspector', () => {
  it('shows read-only id and emits patches on change', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    expect(screen.getByLabelText(/^id$/i)).toHaveValue('ammo-hub-01');
    expect(screen.getByLabelText(/^id$/i)).toHaveAttribute('readonly');

    await userEvent.selectOptions(screen.getByLabelText(/zone/i), 'machinery');
    expect(onChange).toHaveBeenLastCalledWith({ zone: 'machinery' });

    const name = screen.getByLabelText(/^name$/i);
    await userEvent.type(name, 'A');
    expect(onChange).toHaveBeenLastCalledWith({ name: 'A' });
  });

  it('game modes are comma-separated and kebab-normalised', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    const modes = screen.getByLabelText(/game modes/i);
    await userEvent.type(modes, 'Classic, Hard Core');
    expect(onChange).toHaveBeenLastCalledWith({ gameModes: ['classic', 'hard-core'] });
  });

  it('advanced toggle makes id editable', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /advanced/i }));
    const id = screen.getByLabelText(/^id$/i);
    expect(id).not.toHaveAttribute('readonly');
  });

  it('live: game modes keep raw text while typing and normalise on blur', async () => {
    render(<LiveInspector initial={{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 }} />);
    const modes = screen.getByLabelText(/game modes/i);
    await userEvent.type(modes, 'Classic, Hard Core');
    expect(modes).toHaveValue('Classic, Hard Core');
    await userEvent.tab();
    expect(modes).toHaveValue('classic, hard-core');
  });

  it('live: variant allows hyphens/spaces while typing and normalises on blur', async () => {
    render(<LiveInspector initial={{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 }} />);
    const variant = screen.getByLabelText(/^variant$/i);
    await userEvent.type(variant, 'Shot Gun');
    expect(variant).toHaveValue('Shot Gun');
    await userEvent.tab();
    expect(variant).toHaveValue('shot-gun');
  });

  it('does not emit NaN coordinates', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 }} onChange={onChange} />);
    const x = screen.getByLabelText(/^x$/i);
    await userEvent.clear(x);
    await userEvent.type(x, '-');
    for (const call of onChange.mock.calls) {
      const patch = call[0] as { x?: number };
      if ('x' in patch) expect(Number.isFinite(patch.x)).toBe(true);
    }
  });
});
