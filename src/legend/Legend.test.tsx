import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { allVisible, noneVisible } from './filterState';
import { Legend } from './Legend';

describe('Legend', () => {
  it('renders one button per category, pressed when visible', () => {
    render(<Legend visible={allVisible()} counts={{}} onChange={() => {}} />);
    const items = screen.getAllByRole('button', { pressed: true });
    expect(items).toHaveLength(10);
    expect(screen.getByRole('button', { name: /healing point/i })).toBeInTheDocument();
  });

  it('click toggles a category', async () => {
    const onChange = vi.fn();
    render(<Legend visible={allVisible()} counts={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /ammunition/i }));
    const next = onChange.mock.calls[0]?.[0] as Set<string>;
    expect(next.has('ammo')).toBe(false);
    expect(next.size).toBe(9);
  });

  it('double-click solos a category', async () => {
    const onChange = vi.fn();
    render(<Legend visible={allVisible()} counts={{}} onChange={onChange} />);
    await userEvent.dblClick(screen.getByRole('button', { name: /black box/i }));
    const last = onChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect([...last]).toEqual(['black-box']);
  });

  it('All / None buttons', async () => {
    const onChange = vi.fn();
    render(<Legend visible={noneVisible()} counts={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect((onChange.mock.calls[0]?.[0] as Set<string>).size).toBe(10);
    await userEvent.click(screen.getByRole('button', { name: /^none$/i }));
    expect((onChange.mock.calls[1]?.[0] as Set<string>).size).toBe(0);
  });

  it('shows the count in the item title', () => {
    render(<Legend visible={allVisible()} counts={{ healing: 5 }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /healing point/i })).toHaveAttribute('title', expect.stringContaining('5'));
  });

  it('has a drawer handle that toggles aria-expanded', async () => {
    render(<Legend visible={allVisible()} counts={{}} onChange={() => {}} />);
    const handle = screen.getByRole('button', { name: /legend/i });
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(handle);
    expect(handle).toHaveAttribute('aria-expanded', 'true');
  });
});
