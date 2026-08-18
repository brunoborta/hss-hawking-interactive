import { CATEGORY_BY_ID } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONE_BY_ID } from '../data/zones';
import { GAME_MODE_BY_ID } from '../data/gameModes';
import { CategoryIcon } from '../icons/CategoryIcon';
import { displayName } from '../lib/display';

const BASE = import.meta.env.BASE_URL;

export function PoiPopup({ poi }: { poi: Poi }) {
  const cat = CATEGORY_BY_ID[poi.category];
  return (
    <div className="min-w-[200px] max-w-[280px] text-sm">
      <div className="mb-1 flex items-center gap-2">
        <CategoryIcon category={poi.category} size={20} />
        <h3 className="text-base font-semibold leading-tight">{displayName(poi)}</h3>
      </div>
      <div className="mb-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.15em] text-cyan-line/90">
        <span>{cat.label}</span>
        <span>·</span>
        <span>{ZONE_BY_ID[poi.zone].label}</span>
        {poi.variant && (
          <>
            <span>·</span>
            <span>{poi.variant}</span>
          </>
        )}
      </div>
      {poi.media && (
        <img
          src={`${BASE}${poi.media.src}`}
          alt={poi.media.alt ?? displayName(poi)}
          loading="lazy"
          className="mb-2 w-full rounded border border-cyan-line/30"
        />
      )}
      {poi.description && <p className="leading-snug">{poi.description}</p>}
      {poi.gameModes && poi.gameModes.length > 0 && (
        <p className="mt-2 text-xs text-white/60">
          Modes: {poi.gameModes.map((m) => GAME_MODE_BY_ID[m].label).join(', ')}
        </p>
      )}
    </div>
  );
}
