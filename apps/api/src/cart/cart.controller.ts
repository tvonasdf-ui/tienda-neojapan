import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { cartIdParamsSchema, cartItemBodySchema, cartItemParamsSchema } from './cart.dtos';
import { CartService } from './cart.service';

@Controller('carts')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get(':cartId')
  get(@Param(new ZodValidationPipe(cartIdParamsSchema)) params: z.infer<typeof cartIdParamsSchema>) {
    return this.carts.get(params.cartId);
  }

  @Post(':cartId/items/:variantId')
  add(
    @Param(new ZodValidationPipe(cartItemParamsSchema)) params: z.infer<typeof cartItemParamsSchema>,
    @Body(new ZodValidationPipe(cartItemBodySchema)) body: z.infer<typeof cartItemBodySchema>,
  ) {
    return this.carts.add(params.cartId, params.variantId, body.quantity);
  }

  @Patch(':cartId/items/:variantId')
  setQuantity(
    @Param(new ZodValidationPipe(cartItemParamsSchema)) params: z.infer<typeof cartItemParamsSchema>,
    @Body(new ZodValidationPipe(cartItemBodySchema)) body: z.infer<typeof cartItemBodySchema>,
  ) {
    return this.carts.setQuantity(params.cartId, params.variantId, body.quantity);
  }

  @Delete(':cartId/items/:variantId')
  remove(@Param(new ZodValidationPipe(cartItemParamsSchema)) params: z.infer<typeof cartItemParamsSchema>) {
    return this.carts.remove(params.cartId, params.variantId);
  }
}
