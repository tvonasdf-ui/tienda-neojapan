import { z } from 'zod';
import { StockLocation, StockMovementType } from '@neojapan/schemas';

export const variantIdParamsSchema = z.object({
  variantId: z.string().uuid(),
});
export type VariantIdParams = z.infer<typeof variantIdParamsSchema>;

export const movementListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: StockMovementType.optional(),
});
export type MovementListQuery = z.infer<typeof movementListQuerySchema>;

export const movementBodySchema = z.object({
  location: StockLocation,
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(240),
  refId: z.string().trim().max(80).optional(),
  userId: z.string().uuid().optional(),
});
export type MovementBody = z.infer<typeof movementBodySchema>;

export const adjustBodySchema = movementBodySchema
  .omit({ quantity: true })
  .extend({
    delta: z.coerce.number().int().refine((n) => n !== 0, 'el delta no puede ser 0'),
    type: z.enum(['ADJUSTMENT', 'LOSS']).default('ADJUSTMENT'),
  });
export type AdjustBody = z.infer<typeof adjustBodySchema>;