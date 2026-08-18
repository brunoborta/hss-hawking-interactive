import { CATEGORY_BY_ID, type CategoryId } from '../data/categories';

function badge(color: string, glyph: string, glyphColor = '#0b2a33'): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
    `<circle cx="12" cy="12" r="11" fill="${color}" stroke="#0b2a33" stroke-width="1.5"/>` +
    `<g fill="${glyphColor}" stroke="${glyphColor}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`
  );
}

const c = (id: CategoryId) => CATEGORY_BY_ID[id].color;

/** Map-style pin whose tip sits at the bottom centre of the viewBox (12, 22.5). */
function pin(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
    `<path d="M12 1.5c-4.1 0-7.5 3.3-7.5 7.4 0 5.4 7.5 13.6 7.5 13.6s7.5-8.2 7.5-13.6c0-4.1-3.4-7.4-7.5-7.4z" ` +
    `fill="${color}" stroke="#0b2a33" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<circle cx="12" cy="9" r="2.8" fill="#0b2a33"/>` +
    `</svg>`
  );
}

export const ICON_SVG: Record<CategoryId, string> = {
  healing: badge(c('healing'), `<path d="M12 6.5v11M6.5 12h11" stroke-width="3" fill="none"/>`),
  ammo: badge(
    c('ammo'),
    `<path d="M9 17V10a3 3 0 0 1 6 0v7z" stroke-width="1"/><rect x="8.5" y="17" width="7" height="2" rx="0.5"/>`,
  ),
  capsule: badge(
    '#6b7280',
    `<circle cx="12" cy="8.5" r="2.4" fill="#fff" stroke="none"/><path d="M8 18v-3.5a4 4 0 0 1 8 0V18z" fill="#fff" stroke="none"/>`,
  ),
  info: badge(
    '#1f2937',
    `<circle cx="12" cy="7.5" r="1.4" fill="#fff" stroke="none"/><rect x="10.8" y="10" width="2.4" height="7.5" rx="1" fill="#fff" stroke="none"/>`,
    '#fff',
  ),
  'self-destruct': badge(
    c('self-destruct'),
    `<circle cx="12" cy="12" r="5.5" fill="none" stroke-width="2"/><path d="M12 5.5v3M12 15.5v3M5.5 12h3M15.5 12h3" stroke-width="2"/><circle cx="12" cy="12" r="1.8" stroke="none"/>`,
  ),
  'black-box': badge(
    c('black-box'),
    `<rect x="6.5" y="8" width="11" height="9" rx="1.2" stroke-width="1.5" fill="none"/><path d="M6.5 11h11M9.5 8V6.5h5V8" stroke-width="1.5" fill="none"/>`,
  ),
  'pipe-lever': badge(
    c('pipe-lever'),
    `<path d="M7 17h10M12 17V9" stroke-width="2.5" fill="none"/><path d="M12 9l4-3.5" stroke-width="2.5" fill="none"/><circle cx="16.3" cy="5.3" r="1.6" stroke="none"/>`,
  ),
  weapon: badge(
    c('weapon'),
    `<path d="M5 10h13v3h-6l-1 4h-3l1-4H5z" stroke-width="1"/><path d="M18 10.5h1.5" stroke-width="2"/>`,
  ),
  'command-deck': pin(c('command-deck')),
  shuttle: badge(
    c('shuttle'),
    // ship silhouette drawn nose-up, rotated to point left (the player's ship approaches from the left)
    `<g transform="rotate(-90 12 12)"><path d="M12 4.5l3 5.5v4.5l2.5 2.5v1.5l-3.5-1V19h-4v-1.5l-3.5 1v-1.5l2.5-2.5V10z" stroke-width="1"/></g>`,
  ),
};
