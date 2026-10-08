import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SaleStatus } from '@neojapan/schemas';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminSalesService } from './admin-sales.service';

const updateStatusSchema = z.object({
  status: SaleStatus,
});

@Controller('admin/sales')
@UseGuards(SupabaseStaffGuard)
export class AdminSalesController {
  constructor(private readonly sales: AdminSalesService) {}

  @Get()
  list() {
    return this.sales.list();
  }

  @Get('report')
  report() {
    return this.sales.report();
  }

  @Patch(':code/status')
  updateStatus(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: z.infer<typeof updateStatusSchema>,
  ) {
    return this.sales.updateStatus(code, body.status);
  }
}
