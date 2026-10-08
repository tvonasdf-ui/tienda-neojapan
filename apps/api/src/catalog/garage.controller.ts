import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  garagePhoneQuerySchema,
  garageSaveSchema,
} from './garage.dtos';
import { GarageService } from './garage.service';

@Controller('garage')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @Post()
  save(
    @Body(new ZodValidationPipe(garageSaveSchema))
    body: z.infer<typeof garageSaveSchema>,
  ) {
    return this.garageService.save(body);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(garagePhoneQuerySchema))
    query: z.infer<typeof garagePhoneQuerySchema>,
  ) {
    return this.garageService.list(query.phone);
  }
}
