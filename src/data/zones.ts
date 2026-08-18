export const ZONE_IDS = [
  'shuttle-bay',
  'production',
  'laboratory',
  'crew-quarters',
  'machinery',
  'hub',
] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneMeta {
  id: ZoneId;
  label: string;
}

export const ZONES: readonly ZoneMeta[] = [
  { id: 'shuttle-bay', label: 'Shuttle Bay' },
  { id: 'production', label: 'Production' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'crew-quarters', label: 'Crew Quarters' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'hub', label: 'Hub' },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, ZoneMeta>;

export function isZoneId(v: unknown): v is ZoneId {
  return typeof v === 'string' && (ZONE_IDS as readonly string[]).includes(v);
}
