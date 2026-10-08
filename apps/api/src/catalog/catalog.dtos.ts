import { Condition, id } from '@neojapan/schemas';
import { z } from 'zod';

export const productListQuerySchema = z.object({
  platform: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  condition: Condition.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  compatibleConsoleId: id.optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  (input) => input.minPrice === undefined || input.maxPrice === undefined || input.minPrice <= input.maxPrice,
  { message: 'el precio mínimo no puede superar el máximo', path: ['minPrice'] },
);

export type ProductListQuery = z.infer<typeof productListQuerySchema>;