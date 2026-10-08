import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createOrderBodySchema,
  createPosSaleBodySchema,
  orderCodeParamsSchema,
} from './orders.dtos';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createOrderBodySchema))
    body: z.infer<typeof createOrderBodySchema>,
  ) {
    return this.orders.create(body);
  }

  @Post('coupon/validate')
  validateCoupon(
    @Body(new ZodValidationPipe(z.object({
      cartId: z.string().uuid(),
      couponCode: z.string().trim().min(1).max(40),
    })))
    body: { cartId: string; couponCode: string },
  ) {
    return this.orders.validateCoupon(body.cartId, body.couponCode);
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('pos')
  createPosSale(
    @Body(new ZodValidationPipe(createPosSaleBodySchema))
    body: z.infer<typeof createPosSaleBodySchema>,
  ) {
    return this.orders.createPosSale(body);
  }

  @Get(':code')
  detail(
    @Param('code', new ZodValidationPipe(orderCodeParamsSchema.shape.code))
    code: string,
  ) {
    return this.orders.detail(code);
  }
}
