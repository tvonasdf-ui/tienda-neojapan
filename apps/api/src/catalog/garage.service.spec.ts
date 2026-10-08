import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { GarageService } from './garage.service';

describe('GarageService', () => {
  it('registra una consola en el Garage del cliente y evita duplicados', async () => {
    const config = {
      get: (key: string) =>
        ({
          DATA_STORE: 'memory',
          STORE_NAME: 'Neojapan',
          STORE_WHATSAPP_NUMBER: '56912345678',
          STORE_BASE_URL: 'https://neojapan.cl',
          RESERVATION_TTL_MINUTES: '30',
        })[key],
    } as unknown as ConfigService;
    const prisma = new PrismaService(config);
    const service = new GarageService(prisma);
    const consoleModel = await prisma.consoleModel.findFirst({
      where: { platform: 'Nintendo Switch' },
      select: { id: true },
    });

    expect(consoleModel).not.toBeNull();

    const first = await service.save({
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      consoleModelId: consoleModel!.id,
      notes: 'OLED',
    });
    const second = await service.save({
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      consoleModelId: consoleModel!.id,
      notes: 'OLED',
    });
    const items = await service.list('+56912345678');

    expect(first.id).toBe(second.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      customerId: expect.any(String),
      consoleModelId: consoleModel!.id,
      notes: 'OLED',
    });
  });
});
