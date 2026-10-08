import { z } from 'zod';
import { CompatibilityLevel, Condition, ProductStatus, id, money, sku, slug } from '@neojapan/schemas';

export const stockInitialSchema = z.object({
  STORE: z.coerce.number().int().nonnegative().default(0),
  WAREHOUSE: z.coerce.number().int().nonnegative().default(0),
});

export const variantCreateSchema = z.object({
  sku,
  condition: Condition,
  price: money,
  cost: money,
  barcode: z.string().trim().max(64).optional(),
  initialStock: stockInitialSchema.optional(),
});

export const compatibilityCreateSchema = z.object({
  consoleModelId: id,
  level: CompatibilityLevel,
  source: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).optional(),
});

export const mediaCreateSchema = z.object({
  publicId: z.string().trim().min(1).max(300),
  alt: z.string().trim().max(200).optional(),
  isPrimary: z.boolean().default(false),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug,
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(80),
  status: ProductStatus.default('DRAFT'),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantCreateSchema).min(1).max(20),
  compatibility: z.array(compatibilityCreateSchema).default([]),
  media: z.array(mediaCreateSchema).default([]),
});

export const variantUpdateSchema = z.object({
  id: id.optional(),
  sku,
  condition: Condition,
  price: money,
  cost: money,
  barcode: z.string().trim().max(64).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().min(1).max(80).optional(),
  platform: z.string().trim().min(1).max(80).optional(),
  status: ProductStatus.optional(),
  isFeatured: z.boolean().optional(),
  variants: z.array(variantUpdateSchema).min(1).max(20).optional(),
});

export const adminProductListQuerySchema = z.object({
  status: ProductStatus.optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;