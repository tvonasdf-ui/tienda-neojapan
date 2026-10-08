import { cartItemRequestSchema, id } from '@neojapan/schemas';
import { z } from 'zod';

export const cartIdParamsSchema = z.object({ cartId: id });
export const cartItemParamsSchema = z.object({ cartId: id, variantId: id });
export const cartItemBodySchema = cartItemRequestSchema.omit({ variantId: true });
export type CartItemBody = z.infer<typeof cartItemBodySchema>;
