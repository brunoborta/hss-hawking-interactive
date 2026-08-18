import { describe, expect, it } from 'vitest';
import { emptyMapData } from '../data/schema';
import { migrateDraft, recoverDraft } from './draftMigration';

const lever = { id: 'pipe-lever-machinery-01', category: 'pipe-lever', zone: 'machinery', x: 1, y: 1 };

describe('migrateDraft', () => {
  it('renames pipe-lever to pipe-lever-blue including the id prefix', () => {
    const out = migrateDraft({ ...emptyMapData(), pois: [lever] }) as { pois: { id: string; category: string }[] };
    expect(out.pois[0]).toMatchObject({ id: 'pipe-lever-blue-machinery-01', category: 'pipe-lever-blue' });
  });
  it('leaves unknown shapes and current categories untouched', () => {
    expect(migrateDraft(null)).toBeNull();
    expect(migrateDraft({ foo: 1 })).toEqual({ foo: 1 });
    const cur = { ...emptyMapData(), pois: [{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 1, y: 1 }] };
    expect(migrateDraft(cur)).toEqual(cur);
  });
});

describe('recoverDraft', () => {
  it('returns a migrated valid draft', () => {
    const r = recoverDraft({ ...emptyMapData(), pois: [lever] });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.migrated).toBe(true);
      expect(r.draft.pois[0]?.category).toBe('pipe-lever-blue');
    }
  });
  it('discards an unrecoverable draft with the schema errors', () => {
    const r = recoverDraft({ ...emptyMapData(), pois: [{ ...lever, category: 'teleporter', id: 'teleporter-hub-01' }] });
    expect(r.kind).toBe('discarded');
    if (r.kind === 'discarded') expect(r.errors.length).toBeGreaterThan(0);
  });
  it('discards garbage', () => {
    expect(recoverDraft('nope').kind).toBe('discarded');
    expect(recoverDraft(undefined).kind).toBe('discarded');
  });
});
