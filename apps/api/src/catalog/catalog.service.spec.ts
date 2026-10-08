import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from './catalog.service';

const primaryPhoto = {
  publicId: 'products/sw-joy_a1',
  alt: 'Joystick de repuesto Switch OLED',
  width: 1200,
  height: 1500,
};

const dbProduct = {
  id: 'p1',
  slug: 'joystick-repuesto-switch-oled',
  name: 'Joystick de repuesto Switch OLED',
  platform: 'Nintendo Switch',
  category: 'Repuestos',
  compatibilities: [],
  media: [primaryPhoto],
  variants: [
    {
      id: 'v1',
      sku: 'SW-JOY-A1',
      condition: 'A',
      price: 24990,
      cost: 12800, // nunca debe filtrarse a la API pública
      barcode: null,
    },
  ],
  _count: { variants: 1 },
};

const dbDetail = {
  ...dbProduct,
  description: 'Repuesto oficial para joy-con del Switch OLED.',
  isFeatured: false,
  compatibilities: [
    {
      id: 'c1',
      level: 'CONFIRMED',
      source: 'test',
      notes: null,
      consoleModel: { name: 'Nintendo Switch OLED', platform: 'Nintendo Switch' },
    },
  ],
};

describe('CatalogService', () => {
  let service: CatalogService;
  const prisma = {
    product: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CatalogService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('listar productos activos con variantes públicas (sin cost)', async () => {
    prisma.product.findMany.mockResolvedValue([dbProduct]);

    const result = await service.list({ limit: 24, offset: 0 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
        skip: 0,
        take: 24,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      slug: dbProduct.slug,
      platform: dbProduct.platform,
      media: primaryPhoto,
    });
    // El costo interno jamás sale en la respuesta pública.
    expect(JSON.stringify(result)).not.toContain('cost');
    expect(result[0]!.variants[0]).not.toHaveProperty('cost');
    expect(result[0]!.variants[0]).toMatchObject({
      sku: 'SW-JOY-A1',
      condition: 'A',
      price: 24990,
    });
  });

  it('filtrar por plataforma y paginar', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await service.list({ platform: 'Nintendo Switch', limit: 12, offset: 24 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', platform: 'Nintendo Switch' },
        skip: 24,
        take: 12,
      }),
    );
  });

  it('propaga niveles de compatibilidad para que las tarjetas no afirmen compatibilidad parcial', async () => {
    prisma.product.findMany.mockResolvedValue([{
      ...dbProduct,
      compatibilities: [{ consoleModelId: 'console-1', level: 'PARTIAL' }],
    }]);

    const [result] = await service.list({
      compatibleConsoleId: 'console-1',
      limit: 24,
      offset: 0,
    });

    expect(result?.compatibilities).toEqual([
      { consoleModelId: 'console-1', level: 'PARTIAL' },
    ]);
  });

  it('cuenta el total de productos usando los mismos filtros de la página', async () => {
    prisma.product.count.mockResolvedValue(51);

    const result = await service.count({
      platform: 'Nintendo Switch',
      limit: 24,
      offset: 24,
    });

    expect(prisma.product.count).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', platform: 'Nintendo Switch' },
    });
    expect(result).toEqual({ total: 51 });
  });

  it('detalle expone compatibilidad por consola', async () => {
    prisma.product.findUnique.mockResolvedValue(dbDetail);

    const result = await service.detail(dbDetail.slug);

    expect(result.compatibility).toHaveLength(1);
    expect(result.compatibility[0]!.consoleModel.name).toBe(
      'Nintendo Switch OLED',
    );
    expect(result.compatibility[0]!.level).toBe('CONFIRMED');
    expect(JSON.stringify(result)).not.toContain('cost');
  });

  it('404 cuando el slug no existe', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.detail('no-existe')).rejects.toThrow(NotFoundException);
  });
});