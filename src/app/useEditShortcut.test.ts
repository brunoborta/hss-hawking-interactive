import { describe, expect, it } from 'vitest';
import { isEditMode } from './useEditShortcut';

describe('isEditMode', () => {
  it('detects ?edit', () => {
    expect(isEditMode('?edit')).toBe(true);
    expect(isEditMode('?edit=1&x=2')).toBe(true);
    expect(isEditMode('')).toBe(false);
    expect(isEditMode('?editor')).toBe(false);
  });
});
