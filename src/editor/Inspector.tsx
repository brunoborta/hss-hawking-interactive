import { useState, type ReactNode } from 'react';
import { CATEGORIES } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONES } from '../data/zones';

type Patch = Partial<Omit<Poi, 'id'>> & { id?: string };

export function kebab(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-[0.15em] text-cyan-line/80">{label}</span>
      {children}
    </label>
  );
}

const input = 'rounded border border-cyan-line/30 bg-black/30 px-2 py-1 text-sm text-white outline-none focus:border-cyan-line';

export function Inspector({ poi, onChange }: { poi: Poi; onChange: (patch: Patch) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [modesText, setModesText] = useState((poi.gameModes ?? []).join(', '));
  const [idText, setIdText] = useState(poi.id);

  // Reset local text state when the selected POI changes (not on every keystroke),
  // using the render-phase "adjusting state" pattern instead of an effect.
  const [syncedId, setSyncedId] = useState(poi.id);
  const [syncedGameModes, setSyncedGameModes] = useState(poi.gameModes);
  if (poi.id !== syncedId) {
    setSyncedId(poi.id);
    setIdText(poi.id);
  }
  if (poi.id !== syncedId || poi.gameModes !== syncedGameModes) {
    setSyncedGameModes(poi.gameModes);
    setModesText((poi.gameModes ?? []).join(', '));
  }

  return (
    <div className="flex flex-col gap-2">
      <Field label="ID" htmlFor="insp-id">
        <input
          id="insp-id"
          className={input}
          value={idText}
          readOnly={!advanced}
          onChange={(e) => {
            setIdText(e.target.value);
            onChange({ id: e.target.value });
          }}
        />
      </Field>
      {advanced && idText.trim() !== poi.id && (
        <p className="text-[10px] text-red-400">Invalid or duplicate id — keeping {poi.id}</p>
      )}
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
        Advanced (edit id manually)
      </label>

      <Field label="Category" htmlFor="insp-category">
        <select id="insp-category" className={input} value={poi.category} onChange={(e) => onChange({ category: e.target.value as Poi['category'] })}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Zone" htmlFor="insp-zone">
        <select id="insp-zone" className={input} value={poi.zone} onChange={(e) => onChange({ zone: e.target.value as Poi['zone'] })}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X" htmlFor="insp-x">
          <input id="insp-x" type="number" step="0.1" className={input} value={poi.x} onChange={(e) => onChange({ x: Number(e.target.value) })} />
        </Field>
        <Field label="Y" htmlFor="insp-y">
          <input id="insp-y" type="number" step="0.1" className={input} value={poi.y} onChange={(e) => onChange({ y: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Name" htmlFor="insp-name">
        <input id="insp-name" className={input} value={poi.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>

      <Field label="Description" htmlFor="insp-description">
        <textarea id="insp-description" rows={3} maxLength={280} className={input} value={poi.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>

      <Field label="Variant" htmlFor="insp-variant">
        <input id="insp-variant" className={input} value={poi.variant ?? ''} onChange={(e) => onChange({ variant: kebab(e.target.value) })} />
      </Field>

      <Field label="Game modes (comma-separated)" htmlFor="insp-modes">
        <input
          id="insp-modes"
          className={input}
          value={modesText}
          onChange={(e) => {
            setModesText(e.target.value);
            const list = e.target.value.split(',').map(kebab).filter(Boolean);
            onChange({ gameModes: list });
          }}
        />
      </Field>

      <Field label="Media src (media/<id>.<ext>)" htmlFor="insp-media">
        <input id="insp-media" className={input} value={poi.media?.src ?? ''} onChange={(e) => onChange({ media: e.target.value ? { src: e.target.value, alt: poi.media?.alt } : undefined })} />
      </Field>

      <Field label="Notes (not shown)" htmlFor="insp-notes">
        <textarea id="insp-notes" rows={2} className={input} value={poi.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value })} />
      </Field>
    </div>
  );
}
