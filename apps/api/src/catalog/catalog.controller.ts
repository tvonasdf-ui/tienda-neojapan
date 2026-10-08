import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { productListQuerySchema } from './catalog.dtos';
import { CatalogService } from './catalog.service';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: z.infer<typeof productListQuerySchema>,
  ) {
    return this.catalogService.list(query);
  }

  @Get('count')
  count(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: z.infer<typeof productListQuerySchema>,
  ) {
    return this.catalogService.count(query);
  }

  @Get(':slug')
  detail(
    @Param('slug', new ZodValidationPipe(z.string().trim().min(1)))
    slug: string,
  ) {
    return this.catalogService.detail(slug);
  }
}