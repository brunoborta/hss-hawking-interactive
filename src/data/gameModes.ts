export const GAME_MODE_IDS = [
  'extract-the-data',
  'kill-the-specimen',
  'destroy-the-area',
  'capture-the-specimen',
] as const;

export type GameModeId = (typeof GAME_MODE_IDS)[number];

export interface GameModeMeta {
  id: GameModeId;
  label: string;
}

export const GAME_MODES: readonly GameModeMeta[] = [
  { id: 'extract-the-data', label: 'Extract the Data' },
  { id: 'kill-the-specimen', label: 'Kill the Specimen' },
  { id: 'destroy-the-area', label: 'Destroy the Area' },
  { id: 'capture-the-specimen', label: 'Capture the Specimen' },
];

export const GAME_MODE_BY_ID = Object.fromEntries(GAME_MODES.map((m) => [m.id, m])) as Record<
  GameModeId,
  GameModeMeta
>;

export function isGameModeId(v: unknown): v is GameModeId {
  return typeof v === 'string' && (GAME_MODE_IDS as readonly string[]).includes(v);
}
