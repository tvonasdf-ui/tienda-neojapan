import { z } from 'zod';

/**
 * Enums de dominio. Se exportan como const + zod enum para poder
 * derivar tanto el runtime (zod) como las uniones de strings.
 */

export const Condition = z.enum(['NEW', 'A', 'B', 'C']);
export type Condition = z.infer<typeof Condition>;

export const SaleChannel = z.enum(['ONLINE', 'POS']);
export type SaleChannel = z.infer<typeof SaleChannel>;

export const SaleStatus = z.enum([
  'REQUESTED',
  'CONFIRMED',
  'PAID',
  'CANCELLED',
]);
export type SaleStatus = z.infer<typeof SaleStatus>;

export const PaymentMethod = z.enum(['CASH', 'CARD', 'TRANSFER']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const PaymentStatus = z.enum(['PENDING', 'PAID', 'REFUNDED', 'VOID']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const CompatibilityLevel = z.enum(['CONFIRMED', 'PARTIAL']);
export type CompatibilityLevel = z.infer<typeof CompatibilityLevel>;

export const UserRole = z.enum(['ADMIN', 'STAFF', 'CUSTOMER']);
export type UserRole = z.infer<typeof UserRole>;

export const StockMovementType = z.enum([
  'RECEIPT',
  'SALE',
  'RESERVATION',
  'RELEASE',
  'ADJUSTMENT',
  'LOSS',
  'RETURN',
]);
export type StockMovementType = z.infer<typeof StockMovementType>;

export const StockLocation = z.enum(['STORE', 'WAREHOUSE']);
export type StockLocation = z.infer<typeof StockLocation>;

export const ProductStatus = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof ProductStatus>;

export const ItemUnitStatus = z.enum([
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'RETURNED',
]);
export type ItemUnitStatus = z.infer<typeof ItemUnitStatus>;

/**
 * Primitivas compartidas del dominio.
 */

export const money = z.coerce.number().int().nonnegative();
export type Money = z.infer<typeof money>;

export const quantity = z.coerce.number().int().nonnegative();
export type Quantity = z.infer<typeof quantity>;

export const id = z.string().uuid();
export type Id = z.infer<typeof id>;

export const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug inválido');

export const sku = z.string().trim().min(1).max(64);

export const shortCode = z.string().regex(/^NJ-\d{4,}$/);

export const clpBill = z.object({
  currency: z.literal('CLP').default('CLP'),
  amount: money,
});

export const isoDate = z.string().datetime({ offset: true });