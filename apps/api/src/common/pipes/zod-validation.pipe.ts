import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { ZodType, z } from 'zod';

/**
 * Pipe de validación basado en Zod. Los contratos viven en
 * `@neojapan/schemas` (regla del proyecto: no duplicar shapes).
 *
 * Uso:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(saleCreateSchema)) body: SaleCreate) { }
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodType>
  implements PipeTransform<unknown, z.infer<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Payload inválido',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}