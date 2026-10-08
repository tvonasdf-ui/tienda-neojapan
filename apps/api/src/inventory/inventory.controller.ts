import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { StaffIdentity } from '../auth/staff-identity';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { CONDITION_POLICY } from './condition-policy';
import {
  adjustBodySchema,
  movementBodySchema,
  movementListQuerySchema,
  variantIdParamsSchema,
} from './inventory.dtos';
import { InventoryService } from './inventory.service';

type MovementBody = z.infer<typeof movementBodySchema>;

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Política expuesta para que la tienda/panel renderice chips sin duplicar. */
  @Get('conditions')
  conditions() {
    return CONDITION_POLICY;
  }

  @UseGuards(SupabaseStaffGuard)
  @Get('variants/:variantId/stock')
  stock(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
  ) {
    return this.inventory.stockLevels(params.variantId);
  }

  @UseGuards(SupabaseStaffGuard)
  @Get('variants/:variantId/movements')
  movements(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Query(new ZodValidationPipe(movementListQuerySchema))
    query: z.infer<typeof movementListQuerySchema>,
  ) {
    return this.inventory.movements(params.variantId, query);
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('variants/:variantId/movements/receipt')
  receive(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Body(new ZodValidationPipe(movementBodySchema))
    body: MovementBody,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.inventory.receive(params.variantId, { ...body, userId: staff.id });
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('variants/:variantId/movements/adjust')
  adjust(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Body(new ZodValidationPipe(adjustBodySchema))
    body: z.infer<typeof adjustBodySchema>,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.inventory.adjust(params.variantId, { ...body, userId: staff.id });
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('variants/:variantId/reservations')
  reserve(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Body(new ZodValidationPipe(movementBodySchema))
    body: MovementBody,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.inventory.reserve(params.variantId, { ...body, userId: staff.id });
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('variants/:variantId/reservations/release')
  release(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Body(new ZodValidationPipe(movementBodySchema))
    body: MovementBody,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.inventory.release(params.variantId, { ...body, userId: staff.id });
  }

  @UseGuards(SupabaseStaffGuard)
  @Post('variants/:variantId/movements/commit')
  commit(
    @Param(new ZodValidationPipe(variantIdParamsSchema))
    params: z.infer<typeof variantIdParamsSchema>,
    @Body(new ZodValidationPipe(movementBodySchema))
    body: MovementBody,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.inventory.commit(params.variantId, { ...body, userId: staff.id });
  }
}