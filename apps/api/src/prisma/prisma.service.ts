import {
  Global,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  Module,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { createMemoryClient, type StoreClient } from './memory/memory-db';

/**
 * Cliente de datos. Con `DATA_STORE=memory` (desarrollo/demo sin DB real, plan
 * Fase 1) sirve un store en memoria; en caso contrario delega en Prisma real.
 * El `Proxy` redirige los modelos y `$transaction`/`$queryRaw` al store en
 * memoria cuando corresponde, manteniendo el mismo type surface de PrismaClient.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  readonly memoryClient: StoreClient | undefined;

  constructor(config: ConfigService) {
    super();
    if (config.get<string>('DATA_STORE') === 'memory') {
      this.memoryClient = createMemoryClient();
      new Logger('Prisma').warn(
        'DATA_STORE=memory: inventario/catálogo en memoria (demo sin base de datos).',
      );
    }
    return new Proxy(this, memoryProxyHandler) as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    if (this.memoryClient) return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.memoryClient) return;
    await this.$disconnect();
  }
}

const memoryProxyHandler: ProxyHandler<PrismaService> = {
  get(target, prop, receiver) {
    const memory = target.memoryClient;
    if (memory && typeof prop === 'string' && prop in memory) {
      const value = (memory as unknown as Record<string, unknown>)[prop];
      return typeof value === 'function' ? value.bind(memory) : value;
    }
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
};

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (config: ConfigService) => new PrismaService(config),
      inject: [ConfigService],
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}