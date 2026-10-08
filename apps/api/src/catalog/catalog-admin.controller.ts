import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { id } from '@neojapan/schemas';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminCatalogService } from './catalog-admin.service';
import {
  adminProductListQuerySchema,
  createProductSchema,
  updateProductSchema,
} from './catalog-admin.dtos';

@Controller('admin/products')
@UseGuards(SupabaseStaffGuard)
export class AdminCatalogController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminProductListQuerySchema))
    query: z.infer<typeof adminProductListQuerySchema>,
  ) {
    return this.adminCatalogService.list(query);
  }

  @Get(':productId')
  detail(
    @Param('productId', new ZodValidationPipe(id))
    productId: string,
  ) {
    return this.adminCatalogService.detail(productId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProductSchema))
    body: z.infer<typeof createProductSchema>,
  ) {
    return this.adminCatalogService.create(body);
  }

  @Patch(':productId')
  update(
    @Param('productId', new ZodValidationPipe(id))
    productId: string,
    @Body(new ZodValidationPipe(updateProductSchema))
    body: z.infer<typeof updateProductSchema>,
  ) {
    return this.adminCatalogService.update(productId, body);
  }
}