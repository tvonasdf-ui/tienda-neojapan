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
import {
  advanceRepairTicketBodySchema,
  createRepairTicketBodySchema,
  repairIdParamsSchema,
  repairTicketListQuerySchema,
} from './repairs.dtos';
import { RepairsService } from './repairs.service';

@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairs: RepairsService) {}

  @UseGuards(SupabaseStaffGuard)
  @Post()
  create(
    @Body(new ZodValidationPipe(createRepairTicketBodySchema))
    body: z.infer<typeof createRepairTicketBodySchema>,
    @CurrentStaff() staff: StaffIdentity,
  ) {
    return this.repairs.create(body, staff.id);
  }

  @UseGuards(SupabaseStaffGuard)
  @Get()
  list(
    @Query(new ZodValidationPipe(repairTicketListQuerySchema))
    query: z.infer<typeof repairTicketListQuerySchema>,
  ) {
    return this.repairs.list(query);
  }

  @UseGuards(SupabaseStaffGuard)
  @Get(':repairId')
  detail(
    @Param(new ZodValidationPipe(repairIdParamsSchema))
    params: z.infer<typeof repairIdParamsSchema>,
  ) {
    return this.repairs.detail(params.repairId);
  }

  @UseGuards(SupabaseStaffGuard)
  @Post(':repairId/advance')
  advance(
    @Param(new ZodValidationPipe(repairIdParamsSchema))
    params: z.infer<typeof repairIdParamsSchema>,
    @Body(new ZodValidationPipe(advanceRepairTicketBodySchema))
    body: z.infer<typeof advanceRepairTicketBodySchema>,
  ) {
    return this.repairs.advance(params.repairId, body);
  }
}