export const CATEGORY_IDS = [
  'healing',
  'ammo',
  'capsule',
  'info',
  'self-destruct',
  'black-box',
  'pipe-lever',
  'weapon',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'healing', label: 'Healing Point', color: '#4ade80' },
  { id: 'ammo', label: 'Ammunition', color: '#facc15' },
  { id: 'capsule', label: 'Respawn Capsule', color: '#e5e7eb' },
  { id: 'info', label: 'Information', color: '#f8fafc' },
  { id: 'self-destruct', label: 'Self-Destruction', color: '#f87171' },
  { id: 'black-box', label: 'Black Box', color: '#c084fc' },
  { id: 'pipe-lever', label: 'Pipe Lever', color: '#7dd3fc' },
  { id: 'weapon', label: 'Weapon', color: '#fb923c' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>;

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}
