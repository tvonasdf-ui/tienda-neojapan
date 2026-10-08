import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const createdAt = new Date('2026-10-07T12:00:00.000Z');

interface FakePrisma {
  variant: { findUnique: Mock };
  stockLevel: {
    findMany: Mock;
    findUnique: Mock;
    findUniqueOrThrow: Mock;
    create: Mock;
    update: Mock;
  };
  stockMovement: { findMany: Mock; count: Mock; create: Mock };
  $queryRaw: Mock;
  $transaction: Mock<
    (txFn: (tx: unknown) => Promise<unknown>) => Promise<unknown>
  >;
}

function fakePrisma(): FakePrisma {
  const prisma: FakePrisma = {
    variant: { findUnique: vi.fn() },
    stockLevel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((txFn) => txFn(prisma) as Promise<unknown>),
  };
  return prisma;
}

const prisma = fakePrisma();

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('receive (ingreso de mercadería)', () => {
    it('crea el nivel si no existe y registra el movimiento', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue(null);
      prisma.stockLevel.create.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 0,
      });
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 0,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 'm1',
        variantId: 'v1',
        type: 'RECEIPT',
        delta: 5,
        reason: 'Recepción inicial',
        location: 'STORE',
        refId: null,
        userId: null,
        createdAt,
      });

      const result = await service.receive('v1', {
        location: 'STORE',
        quantity: 5,
        reason: 'Recepción inicial',
      });

      expect(prisma.stockLevel.create).toHaveBeenCalledWith({
        data: {
          variantId: 'v1',
          location: 'STORE',
          onHand: 5,
          reserved: 0,
        },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantId: 'v1',
          type: 'RECEIPT',
          delta: 5,
          reason: 'Recepción inicial',
          location: 'STORE',
        }),
      });
      expect(result.stock).toEqual({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 0,
        available: 5,
      });
      expect(result.movement.type).toBe('RECEIPT');
      expect(result.movement.delta).toBe(5);
      expect(result.movement.createdAt).toBe('2026-10-07T12:00:00.000Z');
    });

    it('incrementa el nivel existente sin tocar la reserva', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 3,
        reserved: 0,
      });
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 8,
        reserved: 0,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 'm2',
        variantId: 'v1',
        type: 'RECEIPT',
        delta: 5,
        reason: 'Reposición',
        location: 'STORE',
        refId: null,
        userId: null,
        createdAt,
      });

      const result = await service.receive('v1', {
        location: 'STORE',
        quantity: 5,
        reason: 'Reposición',
      });

      expect(prisma.stockLevel.update).toHaveBeenCalledWith({
        where: {
          variantId_location: { variantId: 'v1', location: 'STORE' },
        },
        data: { onHand: { increment: 5 } },
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(result.stock.available).toBe(8);
    });
  });

  describe('reserve / release / commit', () => {
    it('reserva unidades si hay capacidad', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 0,
      });
      prisma.$queryRaw.mockResolvedValue([{ updated: true }]);
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 2,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 'r1',
        variantId: 'v1',
        type: 'RESERVATION',
        delta: 2,
        reason: 'Reserva pedido NJ-1001',
        location: 'STORE',
        refId: 'pedido-nj-1001',
        userId: null,
        createdAt,
      });

      const result = await service.reserve('v1', {
        location: 'STORE',
        quantity: 2,
        reason: 'Reserva pedido NJ-1001',
        refId: 'pedido-nj-1001',
      });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'RESERVATION',
          delta: 2,
          refId: 'pedido-nj-1001',
        }),
      });
      expect(result.stock).toMatchObject({ onHand: 5, reserved: 2, available: 3 });
    });

    it('rechaza reservar sin capacidad (no se escribe el movimiento)', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 1,
        reserved: 0,
      });

      await expect(
        service.reserve('v1', { location: 'STORE', quantity: 2, reason: 'x' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('libera una reserva', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'WAREHOUSE',
        onHand: 5,
        reserved: 2,
      });
      prisma.$queryRaw.mockResolvedValue([{ updated: true }]);
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'WAREHOUSE',
        onHand: 5,
        reserved: 0,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 'rl1',
        variantId: 'v1',
        type: 'RELEASE',
        delta: -2,
        reason: 'Vencimiento reserva',
        location: 'WAREHOUSE',
        refId: null,
        userId: null,
        createdAt,
      });

      const result = await service.release('v1', {
        location: 'WAREHOUSE',
        quantity: 2,
        reason: 'Vencimiento reserva',
      });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'RELEASE', delta: -2 }),
      });
      expect(result.stock.reserved).toBe(0);
    });

    it('confirma la venta descontando onHand y reserved', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 5,
        reserved: 2,
      });
      prisma.$queryRaw.mockResolvedValue([{ updated: true }]);
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 3,
        reserved: 0,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 's1',
        variantId: 'v1',
        type: 'SALE',
        delta: -2,
        reason: 'Venta confirmada',
        location: 'STORE',
        refId: 'pedido-nj-1001',
        userId: null,
        createdAt,
      });

      const result = await service.commit('v1', {
        location: 'STORE',
        quantity: 2,
        reason: 'Venta confirmada',
        refId: 'pedido-nj-1001',
      });

      expect(result.stock).toMatchObject({ onHand: 3, reserved: 0 });
      expect(result.movement.type).toBe('SALE');
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SALE', delta: -2 }),
      });
    });
  });

  describe('adjust', () => {
    it('crea un ajuste positivo sobre nivel inexistente', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue(null);
      prisma.stockLevel.create.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 10,
        reserved: 0,
      });
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 10,
        reserved: 0,
      });
      prisma.stockMovement.create.mockResolvedValue({
        id: 'a1',
        variantId: 'v1',
        type: 'ADJUSTMENT',
        delta: 10,
        reason: 'Reconteo alza',
        location: 'STORE',
        refId: null,
        userId: null,
        createdAt,
      });

      const result = await service.adjust('v1', {
        location: 'STORE',
        delta: 10,
        type: 'ADJUSTMENT',
        reason: 'Reconteo alza',
      });

      expect(prisma.stockLevel.create).toHaveBeenCalledWith({
        data: {
          variantId: 'v1',
          location: 'STORE',
          onHand: 10,
          reserved: 0,
        },
      });
      expect(result.movement.type).toBe('ADJUSTMENT');
    });

    it('rechaza un ajuste a la baja mayor que el stock', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findUnique.mockResolvedValue({
        variantId: 'v1',
        location: 'STORE',
        onHand: 1,
        reserved: 0,
      });

      await expect(
        service.adjust('v1', {
          location: 'STORE',
          delta: -5,
          type: 'ADJUSTMENT',
          reason: 'Merma detectada',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('lecturas', () => {
    it('lista niveles con disponible calculado', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockLevel.findMany.mockResolvedValue([
        { variantId: 'v1', location: 'STORE', onHand: 7, reserved: 2 },
        { variantId: 'v1', location: 'WAREHOUSE', onHand: 4, reserved: 0 },
      ]);

      const result = await service.stockLevels('v1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ location: 'STORE', available: 5 });
      expect(result[1]).toMatchObject({ location: 'WAREHOUSE', available: 4 });
    });

    it('pagina movimientos y filtra por tipo', async () => {
      prisma.variant.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.stockMovement.findMany.mockResolvedValue([
        {
          id: 'r1',
          variantId: 'v1',
          type: 'RESERVATION',
          delta: 2,
          reason: 'Reserva',
          location: 'STORE',
          refId: null,
          userId: null,
          createdAt,
        },
      ]);
      prisma.stockMovement.count.mockResolvedValue(1);

      const result = await service.movements('v1', {
        limit: 50,
        offset: 0,
        type: 'RESERVATION',
      });

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: 'v1', type: 'RESERVATION' },
          skip: 0,
          take: 50,
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ type: 'RESERVATION', delta: 2 });
    });

    it('404 cuando la variante no existe', async () => {
      prisma.variant.findUnique.mockResolvedValue(null);

      await expect(service.stockLevels('v1')).rejects.toThrow(NotFoundException);
      await expect(
        service.receive('v1', { location: 'STORE', quantity: 1, reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});