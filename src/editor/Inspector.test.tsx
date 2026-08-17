import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Inspector } from './Inspector';

const poi = { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 } as const;

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
});
