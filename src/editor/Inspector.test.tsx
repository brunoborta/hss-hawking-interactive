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

  it('game modes are checkboxes; checking emits the canonical-ordered list', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={{ ...poi, gameModes: ['destroy-the-area'] }} onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: /destroy the area/i })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: /extract the data/i }));
    expect(onChange).toHaveBeenLastCalledWith({ gameModes: ['extract-the-data', 'destroy-the-area'] });
  });

  it('advanced toggle makes id editable', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /advanced/i }));
    const id = screen.getByLabelText(/^id$/i);
    expect(id).not.toHaveAttribute('readonly');
  });

  it('live: unchecking the last game mode empties the list', async () => {
    render(<LiveInspector initial={{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20, gameModes: ['kill-the-specimen'] }} />);
    const box = screen.getByRole('checkbox', { name: /kill the specimen/i });
    expect(box).toBeChecked();
    await userEvent.click(box);
    expect(box).not.toBeChecked();
    for (const m of ['extract the data', 'destroy the area', 'capture the specimen']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(m, 'i') })).not.toBeChecked();
    }
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
