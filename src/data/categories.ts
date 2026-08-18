import { GAME_MODE_IDS, type GameModeId } from './gameModes';

export const CATEGORY_IDS = [
  'healing',
  'ammo',
  'capsule',
  'info',
  'self-destruct',
  'black-box',
  'pipe-lever',
  'weapon',
  'command-deck',
  'shuttle',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  /** Where the icon's hotspot sits: 'center' (default badges) or 'bottom' (map pins). */
  anchor: 'center' | 'bottom';
  /** Authoring defaults applied by the editor when a POI of this category is created. */
  defaults: {
    /** Name is prefilled as `${namePrefix} - ${zone label}`; the author replaces the zone with the place. */
    namePrefix: string;
    /** Game modes pre-checked on creation (the author can uncheck). */
    gameModes: readonly GameModeId[];
    description?: string;
  };
  /** At most this many POIs of the category may exist (schema + editor enforce it). */
  maxCount?: number;
}

const ALL_MODES = GAME_MODE_IDS;

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'healing', label: 'Healing Point', color: '#4ade80', anchor: 'center', defaults: { namePrefix: 'Healing Point', gameModes: ALL_MODES } },
  { id: 'ammo', label: 'Ammunition', color: '#facc15', anchor: 'center', defaults: { namePrefix: 'Ammo Point', gameModes: ALL_MODES } },
  { id: 'capsule', label: 'Respawn Capsule', color: '#e5e7eb', anchor: 'center', defaults: { namePrefix: 'Respawn Capsule', gameModes: ALL_MODES } },
  { id: 'info', label: 'Information', color: '#f8fafc', anchor: 'center', defaults: { namePrefix: 'Information', gameModes: ALL_MODES } },
  { id: 'self-destruct', label: 'Self-Destruction', color: '#f87171', anchor: 'center', defaults: { namePrefix: 'Self-Destruction', gameModes: ['destroy-the-area'] } },
  { id: 'black-box', label: 'Black Box', color: '#c084fc', anchor: 'center', defaults: { namePrefix: 'Black Box', gameModes: ['extract-the-data'] } },
  {
    id: 'pipe-lever',
    label: 'Pipe Lever',
    color: '#7dd3fc',
    anchor: 'center',
    defaults: { namePrefix: 'Pipe Lever', gameModes: ALL_MODES, description: 'Lever number is randomized (1-8) each run' },
  },
  { id: 'weapon', label: 'Weapon', color: '#fb923c', anchor: 'center', defaults: { namePrefix: 'Weapon', gameModes: ['kill-the-specimen'] } },
  { id: 'command-deck', label: 'Command Deck', color: '#ffffff', anchor: 'bottom', defaults: { namePrefix: 'Command Deck', gameModes: ALL_MODES }, maxCount: 1 },
  { id: 'shuttle', label: 'Shuttle', color: '#22d3ee', anchor: 'center', defaults: { namePrefix: 'Shuttle', gameModes: ALL_MODES }, maxCount: 1 },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>;

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}
