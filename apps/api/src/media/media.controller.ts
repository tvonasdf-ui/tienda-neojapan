import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  confirmUploadSchema,
  signUploadSchema,
} from './media.dtos';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(SupabaseStaffGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('sign')
  sign(
    @Body(new ZodValidationPipe(signUploadSchema))
    body: z.infer<typeof signUploadSchema>,
  ) {
    return this.media.signProductUpload(body.productId);
  }

  @Post()
  confirm(
    @Body(new ZodValidationPipe(confirmUploadSchema))
    body: z.infer<typeof confirmUploadSchema>,
  ) {
    return this.media.confirmProductUpload(body);
  }
}
