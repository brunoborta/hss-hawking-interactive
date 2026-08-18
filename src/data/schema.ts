import { z } from 'zod';
import { CATEGORY_IDS, CATEGORIES } from './categories';
import { ZONE_IDS } from './zones';
import { GAME_MODE_IDS } from './gameModes';
import { parsePoiId, POI_ID_PATTERN } from '../lib/ids';

export const IMAGE_WIDTH = 1395;
export const IMAGE_HEIGHT = 651;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MEDIA_SRC = /^media\/[a-z0-9-]+\.(webp|png|jpg|jpeg|gif|mp4)$/;

export const poiSchema = z
  .object({
    id: z.string().regex(POI_ID_PATTERN, 'id must be <category>-<zone>-<nn>'),
    category: z.enum(CATEGORY_IDS),
    zone: z.enum(ZONE_IDS),
    x: z.number().min(0).max(IMAGE_WIDTH),
    y: z.number().min(0).max(IMAGE_HEIGHT),
    name: z.string().trim().min(1).max(80).optional(),
    description: z
      .string()
      .trim()
      .max(280, 'description must be at most 280 characters')
      .refine((s) => !/[<>]/.test(s), 'description must be plain text (no HTML)')
      .optional(),
    variant: z.string().regex(KEBAB, 'variant must be kebab-case').optional(),
    gameModes: z.array(z.enum(GAME_MODE_IDS)).optional(),
    media: z
      .object({
        src: z.string().regex(MEDIA_SRC, 'media.src must look like media/<id>.<ext>'),
        alt: z.string().trim().max(200).optional(),
      })
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((poi, ctx) => {
    const parsed = parsePoiId(poi.id);
    if (!parsed) return; // regex already reported
    if (parsed.category !== poi.category) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `id category "${parsed.category}" does not match category "${poi.category}"` });
    }
    if (parsed.zone !== poi.zone) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `id zone "${parsed.zone}" does not match zone "${poi.zone}"` });
    }
  });

export const mapDataSchema = z
  .object({
    version: z.literal(1),
    image: z.object({ width: z.literal(IMAGE_WIDTH), height: z.literal(IMAGE_HEIGHT) }),
    pois: z.array(poiSchema),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    const perCategory = new Map<string, number[]>();
    data.pois.forEach((poi, i) => {
      if (seen.has(poi.id)) {
        ctx.addIssue({ code: 'custom', path: ['pois', i, 'id'], message: `duplicate id "${poi.id}"` });
      }
      seen.add(poi.id);
      perCategory.set(poi.category, [...(perCategory.get(poi.category) ?? []), i]);
    });
    for (const cat of CATEGORIES) {
      const idx = perCategory.get(cat.id) ?? [];
      if (cat.maxCount !== undefined && idx.length > cat.maxCount) {
        for (const i of idx.slice(cat.maxCount)) {
          ctx.addIssue({
            code: 'custom',
            path: ['pois', i, 'category'],
            message: `at most ${cat.maxCount} "${cat.id}" POI allowed (found ${idx.length})`,
          });
        }
      }
    }
  });

export type Poi = z.infer<typeof poiSchema>;
export type MapData = z.infer<typeof mapDataSchema>;

export function emptyMapData(): MapData {
  return { version: 1, image: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }, pois: [] };
}

function formatIssues(issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
}

export function safeParseMapData(
  input: unknown,
): { ok: true; data: MapData } | { ok: false; errors: string[] } {
  const result = mapDataSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: formatIssues(result.error.issues) };
}

export function parseMapData(input: unknown): MapData {
  const r = safeParseMapData(input);
  if (r.ok) return r.data;
  throw new Error(`Invalid map data:\n${r.errors.join('\n')}`);
}
