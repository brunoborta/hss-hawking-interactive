import { useState, type ReactNode } from 'react';
import { CATEGORIES } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONES } from '../data/zones';
import { GAME_MODES, type GameModeId } from '../data/gameModes';
import { kebab } from '../lib/kebab';

const GAME_MODE_ORDER = Object.fromEntries(GAME_MODES.map((m, i) => [m.id, i])) as Record<GameModeId, number>;

type Patch = Partial<Omit<Poi, 'id'>> & { id?: string };

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
  const [idText, setIdText] = useState(poi.id);
  const [variantText, setVariantText] = useState(poi.variant ?? '');

  // Reset local text buffers only when the selected POI changes (poi.id) — i.e. a
  // different POI was selected, or the reducer regenerated the id after a
  // category/zone change. Never resync from poi.variant identity
  // changes, since those change on every keystroke once the normalised patch is
  // echoed back through the store (that's the bug this buffering fixes).
  // Render-phase "adjusting state" pattern, kept lint-clean under
  // react-hooks/set-state-in-effect (no useEffect involved).
  const [syncedId, setSyncedId] = useState(poi.id);
  if (poi.id !== syncedId) {
    setSyncedId(poi.id);
    setIdText(poi.id);
    setVariantText(poi.variant ?? '');
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
          <input
            id="insp-x"
            type="number"
            step="0.1"
            className={input}
            value={poi.x}
            onChange={(e) => {
              if (e.target.value === '') return;
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange({ x: v });
            }}
          />
        </Field>
        <Field label="Y" htmlFor="insp-y">
          <input
            id="insp-y"
            type="number"
            step="0.1"
            className={input}
            value={poi.y}
            onChange={(e) => {
              if (e.target.value === '') return;
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange({ y: v });
            }}
          />
        </Field>
      </div>

      <Field label="Name" htmlFor="insp-name">
        <input id="insp-name" className={input} value={poi.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>

      <Field label="Description" htmlFor="insp-description">
        <textarea id="insp-description" rows={3} maxLength={280} className={input} value={poi.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>

      <Field label="Variant" htmlFor="insp-variant">
        <input
          id="insp-variant"
          className={input}
          value={variantText}
          onChange={(e) => {
            setVariantText(e.target.value);
            onChange({ variant: kebab(e.target.value) });
          }}
          onBlur={() => setVariantText(kebab(variantText))}
        />
      </Field>

      <fieldset className="flex flex-col gap-1 text-xs">
        <legend className="uppercase tracking-[0.15em] text-cyan-line/80">
          Game modes <span className="normal-case tracking-normal text-white/50">(none checked = all modes)</span>
        </legend>
        {GAME_MODES.map((m) => {
          const selected = poi.gameModes ?? [];
          const checked = selected.includes(m.id);
          return (
            <label key={m.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const next: GameModeId[] = e.target.checked
                    ? [...selected, m.id]
                    : selected.filter((id) => id !== m.id);
                  // canonical order keeps exports stable
                  next.sort((a, b) => GAME_MODE_ORDER[a] - GAME_MODE_ORDER[b]);
                  onChange({ gameModes: next });
                }}
              />
              {m.label}
            </label>
          );
        })}
      </fieldset>

      <Field label="Media src (media/<id>.<ext>)" htmlFor="insp-media">
        <input id="insp-media" className={input} value={poi.media?.src ?? ''} onChange={(e) => onChange({ media: e.target.value ? { src: e.target.value, alt: poi.media?.alt } : undefined })} />
      </Field>

      <Field label="Notes (not shown)" htmlFor="insp-notes">
        <textarea id="insp-notes" rows={2} className={input} value={poi.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value })} />
      </Field>
    </div>
  );
}
