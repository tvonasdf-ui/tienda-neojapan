import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { SaleStatus, StockLocation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

export interface AdminSaleItem {
  id: string;
  code: string;
  channel: 'ONLINE' | 'POS';
  status: SaleStatus;
  customerName: string;
  deliveryMode: string;
  total: number;
  createdAt: Date;
  lines: Array<{
    sku: string;
    condition: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface AdminSalesReport {
  totals: {
    all: number;
    paid: number;
    pending: number;
    cancelled: number;
  };
  byChannel: Record<'ONLINE' | 'POS', number>;
  recent: Array<{
    date: string;
    total: number;
    sales: number;
  }>;
}

@Injectable()
export class AdminSalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async list(): Promise<{ items: AdminSaleItem[]; total: number }> {
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        include: {
          customer: { select: { name: true } },
          lines: {
            include: {
              variant: {
                include: {
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count(),
    ]);

    return {
      total,
      items: sales.map((sale) => ({
        id: sale.id,
        code: sale.code,
        channel: sale.channel,
        status: sale.status,
        customerName: sale.customer?.name ?? 'Cliente',
        deliveryMode: sale.deliveryMode,
        total: sale.total,
        createdAt: sale.createdAt,
        lines: sale.lines.map((line) => ({
          sku: line.variant.sku,
          condition: line.variant.condition,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      })),
    };
  }

  async updateStatus(code: string, status: SaleStatus) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { code } });
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (sale.status === status) {
        return { code: sale.code, status: sale.status, updatedAt: sale.updatedAt };
      }

      if (sale.channel !== 'ONLINE' || !['REQUESTED', 'CONFIRMED'].includes(sale.status)) {
        throw new ConflictException('La transición de estado no está permitida.');
      }

      if (sale.status === 'CONFIRMED' && status === 'PAID') {
        return tx.sale.update({
          where: { code },
          data: { status },
          select: { code: true, status: true, updatedAt: true },
        });
      }
      if (sale.status !== 'REQUESTED') {
        throw new ConflictException('Una venta confirmada solo puede marcarse como pagada.');
      }

      if (status === 'CANCELLED') {
        const reservations = await tx.stockMovement.findMany({
          where: { refId: code, type: 'RESERVATION', delta: { gt: 0 } },
          select: { variantId: true, delta: true, location: true },
        }) as Array<{ variantId: string; delta: number; location: StockLocation }>;
        for (const movement of reservations) {
          await this.inventory.releaseIn(tx, movement.variantId, movement.delta, movement.location, `Liberación pedido ${code}`, code);
        }
      } else if (status === 'CONFIRMED') {
        if (sale.reservationExpiresAt && sale.reservationExpiresAt <= new Date()) {
          throw new ConflictException('La reserva existente venció; actualiza la solicitud antes de confirmar.');
        }
        const lines = await tx.saleLine.findMany({
          where: { saleId: sale.id },
          select: { variantId: true, quantity: true },
        }) as Array<{ variantId: string; quantity: number }>;
        if (!lines.length) throw new BadRequestException('La solicitud no contiene productos.');

        const existingReservations = sale.reservationExpiresAt
          ? await tx.stockMovement.findMany({
            where: { refId: code, type: 'RESERVATION', delta: { gt: 0 } },
            select: { variantId: true, delta: true, location: true },
          }) as Array<{ variantId: string; delta: number; location: StockLocation }>
          : [];
        for (const line of lines) {
          let remaining = line.quantity;
          const legacy = existingReservations.filter((movement) => movement.variantId === line.variantId);
          for (const movement of legacy) {
            const quantity = Math.min(remaining, movement.delta);
            if (quantity > 0) {
              await this.inventory.commitIn(tx, line.variantId, quantity, movement.location, `Venta confirmada ${code}`, code);
              remaining -= quantity;
            }
          }
          if (remaining === 0) continue;

          const levels = await tx.stockLevel.findMany({
            where: { variantId: line.variantId },
            orderBy: { location: 'asc' },
            select: { location: true, onHand: true, reserved: true },
          }) as Array<{ location: StockLocation; onHand: number; reserved: number }>;
          const available = levels.reduce((sum, level) => sum + Math.max(0, level.onHand - level.reserved), 0);
          if (available < remaining) {
            throw new ConflictException('Stock insuficiente para confirmar la solicitud.');
          }
          for (const level of levels) {
            const quantity = Math.min(remaining, Math.max(0, level.onHand - level.reserved));
            if (quantity <= 0) continue;
            await this.inventory.reserveIn(tx, line.variantId, quantity, level.location, `Venta confirmada ${code}`, code);
            await this.inventory.commitIn(tx, line.variantId, quantity, level.location, `Venta confirmada ${code}`, code);
            remaining -= quantity;
            if (remaining === 0) break;
          }
        }
      } else {
        throw new BadRequestException('Una solicitud solo puede confirmarse o cancelarse.');
      }

      const update = await tx.sale.updateMany({
        where: { code, status: sale.status },
        data: { status, reservationExpiresAt: null },
      });
      if (update.count !== 1) {
        throw new ConflictException('La solicitud ya fue actualizada por otro usuario.');
      }
      return tx.sale.findUnique({
        where: { code },
        select: { code: true, status: true, updatedAt: true },
      });
    });
  }

  async report(): Promise<AdminSalesReport> {
    const sales = await this.prisma.sale.findMany({
      select: {
        id: true,
        channel: true,
        status: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totals = sales.reduce(
      (acc, sale) => {
        acc.all += sale.total;
        if (sale.status === 'PAID') acc.paid += sale.total;
        if (sale.status === 'REQUESTED' || sale.status === 'CONFIRMED') acc.pending += sale.total;
        if (sale.status === 'CANCELLED') acc.cancelled += sale.total;
        acc.byChannel[sale.channel] += sale.total;
        return acc;
      },
      {
        all: 0,
        paid: 0,
        pending: 0,
        cancelled: 0,
        byChannel: { ONLINE: 0, POS: 0 } as Record<'ONLINE' | 'POS', number>,
      },
    );

    const recent = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const daySales = sales.filter((sale) => sale.createdAt.toISOString().slice(0, 10) === key);
      return {
        date: key,
        total: daySales.reduce((sum, sale) => sum + sale.total, 0),
        sales: daySales.length,
      };
    });

    return {
      totals: {
        all: totals.all,
        paid: totals.paid,
        pending: totals.pending,
        cancelled: totals.cancelled,
      },
      byChannel: {
        ONLINE: totals.byChannel.ONLINE,
        POS: totals.byChannel.POS,
      },
      recent,
    };
  }
}
