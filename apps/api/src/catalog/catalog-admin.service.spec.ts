import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AdminCatalogService } from './catalog-admin.service';

interface FakePrisma {
  product: {
    create: Mock;
    findMany: Mock;
    findUnique: Mock;
    update: Mock;
    count: Mock;
  };
  variant: {
    create: Mock;
    findMany: Mock;
    findFirst: Mock;
    update: Mock;
  };
  stockLevel: { findMany: Mock };
  compatibility: { createMany: Mock };
  mediaAsset: { createMany: Mock };
  $transaction: Mock<
    (txFn: (tx: unknown) => Promise<unknown>) => Promise<unknown>
  >;
}

const productRow = {
  id: 'p1',
  slug: 'mario-kart-8',
  name: 'Mario Kart 8 Deluxe',
  description: null,
  category: 'Videojuego',
  platform: 'Nintendo Switch',
  status: 'DRAFT',
  isFeatured: false,
  createdAt: new Date('2026-10-07T12:00:00.000Z'),
  updatedAt: new Date('2026-10-07T12:00:00.000Z'),
};

const variantRow = {
  id: 'v1',
  productId: 'p1',
  sku: 'MK8-SWITCH-A',
  condition: 'A',
  price: 34990,
  cost: 18990,
  barcode: null,
};

function fakePrisma(): FakePrisma {
  const prisma: FakePrisma = {
    product: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    variant: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockLevel: { findMany: vi.fn() },
    compatibility: { createMany: vi.fn() },
    mediaAsset: { createMany: vi.fn() },
    $transaction: vi.fn((txFn) => txFn(prisma) as Promise<unknown>),
  };
  return prisma;
}

function p2002(target: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: '6.0.0',
    meta: { target: [target] },
  });
}

const prisma = fakePrisma();
const inventory = { receiptIn: vi.fn() };

describe('AdminCatalogService', () => {
  let service: AdminCatalogService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminCatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
      ],
    }).compile();

    service = moduleRef.get(AdminCatalogService);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('create (alta de producto)', () => {
    it('crea producto, variantes, compatibilidad y media; registra el stock inicial como RECEIPT', async () => {
      prisma.product.create.mockResolvedValue(productRow);
      prisma.variant.create.mockResolvedValue(variantRow);
      prisma.variant.findMany.mockResolvedValue([
        { ...variantRow, stockLevels: [] },
      ]);
      prisma.stockLevel.findMany.mockResolvedValue([
        { variantId: 'v1', location: 'STORE', onHand: 3, reserved: 0 },
      ]);
      prisma.compatibility.createMany.mockResolvedValue({ count: 1 });
      prisma.mediaAsset.createMany.mockResolvedValue({ count: 1 });
      inventory.receiptIn.mockResolvedValue({ movement: {}, stock: {} });

      const result = await service.create({
        slug: 'mario-kart-8',
        name: 'Mario Kart 8 Deluxe',
        category: 'Videojuego',
        platform: 'Nintendo Switch',
        status: 'DRAFT',
        isFeatured: false,
        variants: [
          {
            sku: 'MK8-SWITCH-A',
            condition: 'A',
            price: 34990,
            cost: 18990,
            initialStock: { STORE: 3, WAREHOUSE: 0 },
          },
        ],
        compatibility: [
          { consoleModelId: 'c1', level: 'CONFIRMED', source: 'Fabricante' },
        ],
        media: [{ publicId: 'neojapan/mk8-main', alt: 'Portada', isPrimary: false }],
      });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'mario-kart-8',
          name: 'Mario Kart 8 Deluxe',
          description: null,
          category: 'Videojuego',
          platform: 'Nintendo Switch',
        }),
      });
      expect(prisma.variant.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          sku: 'MK8-SWITCH-A',
          condition: 'A',
          price: 34990,
          cost: 18990,
          barcode: null,
        },
      });
      expect(inventory.receiptIn).toHaveBeenCalledTimes(1);
      expect(inventory.receiptIn).toHaveBeenCalledWith(
        expect.anything(),
        'v1',
        'STORE',
        3,
        'Stock inicial de alta de catálogo',
      );
      expect(prisma.compatibility.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId: 'p1',
            consoleModelId: 'c1',
            level: 'CONFIRMED',
            source: 'Fabricante',
            notes: null,
          },
        ],
      });

      expect(result.id).toBe('p1');
      expect(result.variants[0].stock).toEqual({
        STORE: { onHand: 3, reserved: 0 },
      });
      expect(result.media[0].isPrimary).toBe(true);
      expect(result.compatibility[0].consoleModelId).toBe('c1');
    });

    it('no registra stock inicial cuando el alta no lo pide', async () => {
      prisma.product.create.mockResolvedValue(productRow);
      prisma.variant.create.mockResolvedValue(variantRow);
      prisma.variant.findMany.mockResolvedValue([variantRow]);
      prisma.stockLevel.findMany.mockResolvedValue([]);

      await service.create({
        slug: 'mario-kart-8',
        name: 'Mario Kart 8 Deluxe',
        category: 'Videojuego',
        platform: 'Nintendo Switch',
        status: 'DRAFT',
        isFeatured: false,
        variants: [
          { sku: 'MK8-SWITCH-A', condition: 'A', price: 34990, cost: 18990 },
        ],
        compatibility: [],
        media: [],
      });

      expect(inventory.receiptIn).not.toHaveBeenCalled();
    });

    it('traduce la colisión de slug/SKU a 409', async () => {
      prisma.product.create.mockRejectedValue(p2002('slug'));

      await expect(
        service.create({
          slug: 'mario-kart-8',
          name: 'Mario Kart 8 Deluxe',
          category: 'Videojuego',
          platform: 'Nintendo Switch',
          status: 'DRAFT',
          isFeatured: false,
          variants: [
            { sku: 'MK8-SWITCH-A', condition: 'A', price: 34990, cost: 18990 },
          ],
          compatibility: [],
          media: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update (edición de producto)', () => {
    it('aplica parche de campos y hace upsert de variantes', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: 'p1' })
        .mockResolvedValueOnce({
          ...productRow,
          name: 'Mario Kart 8',
          variants: [],
          compatibilities: [],
          media: [],
        });
      prisma.variant.findFirst.mockResolvedValue({ id: 'v1' });
      prisma.variant.update.mockResolvedValue(variantRow);
      prisma.variant.create.mockResolvedValue({
        ...variantRow,
        id: 'v2',
        sku: 'MK8-SWITCH-B',
      });
      prisma.stockLevel.findMany.mockResolvedValue([]);

      await service.update('p1', {
        name: 'Mario Kart 8',
        variants: [
          { id: 'v1', sku: 'MK8-SWITCH-A', condition: 'A', price: 29990, cost: 15000 },
          { sku: 'MK8-SWITCH-B', condition: 'B', price: 24990, cost: 12000 },
        ],
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'Mario Kart 8' },
      });
      expect(prisma.variant.findFirst).toHaveBeenCalledWith({
        where: { id: 'v1', productId: 'p1' },
        select: { id: true },
      });
      expect(prisma.variant.update).toHaveBeenCalled();
      expect(prisma.variant.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          sku: 'MK8-SWITCH-B',
          condition: 'B',
          price: 24990,
          cost: 12000,
          barcode: null,
        },
      });
    });

    it('rechaza variante que no pertenece al producto', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.variant.findFirst.mockResolvedValue(null);

      await expect(
        service.update('p1', {
          variants: [
            { id: 'v1', sku: 'MK8-SWITCH-A', condition: 'A', price: 29990, cost: 15000 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('da 404 si el producto no existe', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Otro' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('detail / list', () => {
    it('da 404 en detail desconocido', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.detail('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lista con total y agrupa stock por ubicación', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'mario-kart-8',
          name: 'Mario Kart 8 Deluxe',
          category: 'Videojuego',
          platform: 'Nintendo Switch',
          status: 'ACTIVE',
          isFeatured: false,
          variants: [
            {
              id: 'v1',
              sku: 'MK8-SWITCH-A',
              condition: 'A',
              price: 34990,
              cost: 18990,
              barcode: null,
              stockLevels: [
                { variantId: 'v1', location: 'STORE', onHand: 3, reserved: 1 },
                { variantId: 'v1', location: 'WAREHOUSE', onHand: 7, reserved: 0 },
              ],
            },
          ],
          media: [{ publicId: 'neojapan/mk8', alt: null, isPrimary: true }],
        },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const { items, total } = await service.list({
        limit: 25,
        offset: 0,
        q: 'mario',
      });

      expect(total).toBe(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'mario', mode: 'insensitive' } },
            { slug: { contains: 'mario', mode: 'insensitive' } },
            { variants: { some: { sku: { contains: 'mario', mode: 'insensitive' } } } },
          ],
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 25,
      });
      expect(items[0].variants[0].stock).toEqual({
        STORE: { onHand: 3, reserved: 1 },
        WAREHOUSE: { onHand: 7, reserved: 0 },
      });
      expect(items[0].primaryMedia?.publicId).toBe('neojapan/mk8');
    });
  });
});