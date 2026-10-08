import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CatalogCacheInvalidationService {
  private readonly logger = new Logger(CatalogCacheInvalidationService.name);

  constructor(private readonly config: ConfigService) {}

  async invalidateProduct(productId: string, slug: string): Promise<void> {
    const url = this.config.get<string>('WEB_REVALIDATE_URL');
    const secret = this.config.get<string>('WEB_REVALIDATE_SECRET');
    if (!url || !secret) {
      this.logger.warn(`Revalidación web sin configurar para ${productId}; el catálogo expirará por TTL.`);
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ productId, slug }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        this.logger.error(`Revalidación web falló para ${productId}: HTTP ${response.status}.`);
      }
    } catch (error) {
      this.logger.error(
        `No se pudo contactar la revalidación web para ${productId}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
