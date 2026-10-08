import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { RepairsService } from './repairs.service';

const createdAt = new Date('2026-10-08T12:00:00.000Z');

function ticketRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    code: 'SR-1234',
    customerName: 'María González',
    customerPhone: '+56912345678',
    deviceName: 'Nintendo Switch OLED',
    deviceModel: 'HEG-001',
    deviceSerialNumber: null,
    faultDescription: 'Drift en el joycon izquierdo.',
    status: overrides.status ?? 'RECEIVED',
    diagnosis: null,
    quoteAmount: null,
    repairNotes: null,
    cancellationReason: null,
    createdByUserId: 'user-1',
    deliveredAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

interface FakePrisma {
  repairTicket: {
    create: Mock;
    findMany: Mock;
    count: Mock;
    findUnique: Mock;
    update: Mock;
  };
  $transaction: Mock<
    (txFn: (tx: unknown) => Promise<unknown>) => Promise<unknown>
  >;
}

function fakePrisma(): FakePrisma {
  const prisma: FakePrisma = {
    repairTicket: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((txFn) => txFn(prisma) as Promise<unknown>),
  };
  return prisma;
}

const prisma = fakePrisma();

describe('RepairsService', () => {
  let service: RepairsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RepairsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(RepairsService);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('create (ingreso de un equipo a reparar)', () => {
    it('genera un código SR-XXXX y abre el ticket como RECEIVED', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);
      prisma.repairTicket.create.mockResolvedValue(ticketRecord());

      const result = await service.create(
        {
          customerName: 'María González',
          customerPhone: '+56912345678',
          deviceName: 'Nintendo Switch OLED',
          deviceModel: 'HEG-001',
          faultDescription: 'Drift en el joycon izquierdo.',
        },
        'user-1',
      );

      expect(prisma.repairTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: expect.stringMatching(/^SR-\d{4,}$/),
          status: 'RECEIVED',
          createdByUserId: 'user-1',
          customerName: 'María González',
        }),
      });
      expect(result.status).toBe('RECEIVED');
      expect(result.code).toBe('SR-1234');
    });
  });

  describe('list', () => {
    it('filtra por estado y pagina', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([
        ticketRecord({ status: 'RECEIVED' }),
      ]);
      prisma.repairTicket.count.mockResolvedValue(1);

      const result = await service.list({ limit: 10, offset: 0, status: 'RECEIVED' });

      expect(prisma.repairTicket.findMany).toHaveBeenCalledWith({
        where: { status: 'RECEIVED' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]!.status).toBe('RECEIVED');
    });
  });

  describe('advance (flujo de estado)', () => {
    it('RECEIVED → DIAGNOSED exige el diagnóstico', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(ticketRecord());

      await expect(
        service.advance('ticket-1', { status: 'DIAGNOSED' }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.repairTicket.update).not.toHaveBeenCalled();
    });

    it('RECEIVED → DIAGNOSED persiste el diagnóstico', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(ticketRecord());
      prisma.repairTicket.update.mockResolvedValue(
        ticketRecord({ status: 'DIAGNOSED', diagnosis: 'Drift confirmado' }),
      );

      const result = await service.advance('ticket-1', {
        status: 'DIAGNOSED',
        diagnosis: 'Drift confirmado',
      });

      expect(prisma.repairTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({
          status: 'DIAGNOSED',
          diagnosis: 'Drift confirmado',
        }),
      });
      expect(result.status).toBe('DIAGNOSED');
    });

    it('QUOTED → APPROVED sin cotización se rechaza con 409', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(
        ticketRecord({ status: 'QUOTED', quoteAmount: 25000 }),
      );

      await expect(
        service.advance('ticket-1', { status: 'QUOTED' }),
      ).rejects.toThrow(ConflictException);
    });

    it('prohíbe saltos ilegales (RECEIVED → IN_REPAIR)', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(ticketRecord());

      await expect(
        service.advance('ticket-1', { status: 'IN_REPAIR' }),
      ).rejects.toThrow(ConflictException);
    });

    it('entrega fija la fecha de entrega (READY → DELIVERED)', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(
        ticketRecord({ status: 'READY' }),
      );
      prisma.repairTicket.update.mockResolvedValue(
        ticketRecord({ status: 'DELIVERED', deliveredAt: new Date() }),
      );

      const result = await service.advance('ticket-1', { status: 'DELIVERED' });

      expect(prisma.repairTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe('DELIVERED');
    });

    it('lanza 404 si el ticket no existe', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.advance('missing', { status: 'DIAGNOSED', diagnosis: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});