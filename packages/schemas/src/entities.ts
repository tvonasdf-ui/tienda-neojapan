import { z } from 'zod';
import {
  CompatibilityLevel,
  Condition,
  ItemUnitStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  RepairStatus,
  SaleChannel,
  SaleStatus,
  StockLocation,
  StockMovementType,
  id,
  money,
  quantity,
  repairCode,
  shortCode,
  sku,
  slug,
  type CompatibilityLevel as CompatibilityLevelType,
} from './common';

const timestamps = {
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }).optional(),
};

export const productSchema = z.object({
  id,
  slug,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(80),
  status: ProductStatus.default('DRAFT'),
  isFeatured: z.boolean().default(false),
  ...timestamps,
});
export type Product = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  id,
  productId: id,
  sku,
  condition: Condition,
  price: money,
  cost: money,
  barcode: z.string().trim().max(64).optional(),
  ...timestamps,
});
export type Variant = z.infer<typeof variantSchema>;

export const stockLevelSchema = z.object({
  id,
  variantId: id,
  location: StockLocation,
  onHand: quantity,
  reserved: quantity,
  updatedAt: z.string().datetime({ offset: true }).optional(),
});
export type StockLevel = z.infer<typeof stockLevelSchema>;

export const stockMovementSchema = z.object({
  id,
  variantId: id,
  delta: z.coerce.number().int(),
  type: StockMovementType,
  reason: z.string().trim().min(1, 'motivo obligatorio'),
  userId: id.optional(),
  refId: z.string().optional(),
  location: StockLocation,
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type StockMovement = z.infer<typeof stockMovementSchema>;

export const consoleModelSchema = z.object({
  id,
  platform: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  revision: z.string().trim().max(40).optional(),
  identificationNotes: z.string().trim().max(2000).optional(),
  ...timestamps,
});
export type ConsoleModel = z.infer<typeof consoleModelSchema>;

export const compatibilitySchema = z.object({
  id,
  productId: id,
  consoleModelId: id,
  level: CompatibilityLevel,
  source: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type Compatibility = z.infer<typeof compatibilitySchema>;
export type CompatibilityLevelValue = CompatibilityLevelType;

export const mediaAssetSchema = z.object({
  id,
  productId: id,
  publicId: z.string().trim().min(1),
  alt: z.string().trim().max(200).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const saleLineSchema = z.object({
  id,
  saleId: id,
  variantId: id,
  quantity: quantity.refine((n) => n > 0, 'la cantidad debe ser mayor que 0'),
  unitPrice: money,
  unitCost: money,
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type SaleLine = z.infer<typeof saleLineSchema>;

export const saleSchema = z.object({
  id,
  code: shortCode,
  channel: SaleChannel,
  status: SaleStatus.default('REQUESTED'),
  customerId: id.optional(),
  staffUserId: id.optional(),
  clientSaleId: z.string().trim().max(64).optional(),
  subtotal: money,
  discountAmount: money.default(0),
  shippingAmount: money.default(0),
  total: money,
  currency: z.literal('CLP').default('CLP'),
  dispatchCommune: z.string().trim().max(80).optional(),
  customerNote: z.string().trim().max(2000).optional(),
  ...timestamps,
});
export type Sale = z.infer<typeof saleSchema>;

export const paymentSchema = z.object({
  id,
  saleId: id,
  method: PaymentMethod,
  amount: money,
  reference: z.string().trim().max(120).optional(),
  status: PaymentStatus.default('PENDING'),
  recordedByUserId: id.optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const customerSchema = z.object({
  id,
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(6).max(32),
  email: z.string().email().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type Customer = z.infer<typeof customerSchema>;

export const garageItemSchema = z.object({
  id,
  customerId: id,
  consoleModelId: id,
  notes: z.string().trim().max(1000).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type GarageItem = z.infer<typeof garageItemSchema>;

export const orderRequestSchema = z.object({
  cartId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(6).max(32),
  deliveryMode: z.enum(['PICKUP', 'DISPATCH']),
  dispatchCommune: z.string().trim().min(1).max(80).optional(),
  couponCode: z.string().trim().min(1).max(40).optional(),
}).refine(
  (input) => input.deliveryMode !== 'DISPATCH' || Boolean(input.dispatchCommune),
  { message: 'indica la comuna para el despacho', path: ['dispatchCommune'] },
);
export type OrderRequest = z.infer<typeof orderRequestSchema>;

export const cartItemRequestSchema = z.object({
  variantId: id,
  quantity: quantity.int().min(1).max(20),
});
export type CartItemRequest = z.infer<typeof cartItemRequestSchema>;

export const itemUnitSchema = z.object({
  id,
  variantId: id,
  serialNumber: z.string().trim().max(80),
  condition: Condition,
  status: ItemUnitStatus.default('AVAILABLE'),
  createdAt: z.string().datetime({ offset: true }).optional(),
});
export type ItemUnit = z.infer<typeof itemUnitSchema>;

/**
 * Ticket de servicio técnico (plan §4.8): recepción de un equipo del cliente,
 * diagnóstico, cotización, reparación, entrega y casos de cierre. El equipo en
 * custodia NO es inventario propio: nunca descuenta en `stock_levels` (a
 * diferencia de lo planificado para el uso de repuestos cuando se implemente).
 */
export const repairTicketSchema = z.object({
  id,
  code: repairCode,
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(6).max(32),
  deviceName: z.string().trim().min(1).max(120),
  deviceModel: z.string().trim().max(80).optional(),
  deviceSerialNumber: z.string().trim().max(80).optional(),
  faultDescription: z.string().trim().min(1).max(2000),
  status: RepairStatus.default('RECEIVED'),
  diagnosis: z.string().trim().max(2000).optional(),
  quoteAmount: money.optional(),
  repairNotes: z.string().trim().max(2000).optional(),
  cancellationReason: z.string().trim().max(2000).optional(),
  createdByUserId: id.optional(),
  deliveredAt: z.string().datetime({ offset: true }).optional(),
  ...timestamps,
});
export type RepairTicket = z.infer<typeof repairTicketSchema>;