import {
  PaymentMethod,
  money,
  orderRequestSchema,
  quantity,
  shortCode,
} from '@neojapan/schemas';
import { z } from 'zod';

export const createOrderBodySchema = orderRequestSchema;
export const orderCodeParamsSchema = z.object({ code: shortCode });
export const createPosSaleBodySchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: quantity.refine((value) => value > 0, 'la cantidad debe ser mayor que 0'),
      }),
    )
    .min(1),
  paymentMethod: PaymentMethod,
  paymentAmount: money,
  reference: z.string().trim().max(120).optional(),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(6).max(32),
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type CreatePosSaleBody = z.infer<typeof createPosSaleBodySchema>;
