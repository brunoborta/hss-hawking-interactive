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
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'healing', label: 'Healing Point', color: '#4ade80', anchor: 'center' },
  { id: 'ammo', label: 'Ammunition', color: '#facc15', anchor: 'center' },
  { id: 'capsule', label: 'Respawn Capsule', color: '#e5e7eb', anchor: 'center' },
  { id: 'info', label: 'Information', color: '#f8fafc', anchor: 'center' },
  { id: 'self-destruct', label: 'Self-Destruction', color: '#f87171', anchor: 'center' },
  { id: 'black-box', label: 'Black Box', color: '#c084fc', anchor: 'center' },
  { id: 'pipe-lever', label: 'Pipe Lever', color: '#7dd3fc', anchor: 'center' },
  { id: 'weapon', label: 'Weapon', color: '#fb923c', anchor: 'center' },
  { id: 'command-deck', label: 'Command Deck', color: '#ffffff', anchor: 'bottom' },
  { id: 'shuttle', label: 'Shuttle', color: '#22d3ee', anchor: 'center' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>;

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}
