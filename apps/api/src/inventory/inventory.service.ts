import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type StockLocation, type StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AdjustBody, MovementBody, MovementListQuery } from './inventory.dtos';
import {
  applyEffectToLevel,
  assertDeltaSign,
  capacityIsSatisfied,
} from './inventory-rules';

export interface StockLevelView {
  variantId: string;
  location: StockLocation;
  onHand: number;
  reserved: number;
  available: number;
}

export interface StockMovementView {
  id: string;
  variantId: string;
  type: StockMovementType;
  delta: number;
  reason: string;
  location: StockLocation;
  refId: string | null;
  userId: string | null;
  createdAt: string;
}

export interface MovementPage {
  items: StockMovementView[];
  total: number;
  limit: number;
  offset: number;
}

export interface LedgerResult {
  movement: StockMovementView;
  stock: StockLevelView;
}

interface MovementInput {
  location: StockLocation;
  reason: string;
  refId?: string;
  userId?: string;
}

function toStockLevelView(level: {
  variantId: string;
  location: StockLocation;
  onHand: number;
  reserved: number;
}): StockLevelView {
  return {
    variantId: level.variantId,
    location: level.location,
    onHand: level.onHand,
    reserved: level.reserved,
    available: level.onHand - level.reserved,
  };
}

function toStockMovementView(movement: {
  id: string;
  variantId: string;
  type: StockMovementType;
  delta: number;
  reason: string;
  location: StockLocation;
  refId: string | null;
  userId: string | null;
  createdAt: Date;
}): StockMovementView {
  return {
    id: movement.id,
    variantId: movement.variantId,
    type: movement.type,
    delta: movement.delta,
    reason: movement.reason,
    location: movement.location,
    refId: movement.refId,
    userId: movement.userId,
    createdAt: movement.createdAt.toISOString(),
  };
}

function conflictMessageFor(type: StockMovementType): string {
  switch (type) {
    case 'RESERVATION':
      return 'stock insuficiente para reservar';
    case 'RELEASE':
      return 'no hay suficientes unidades reservadas para liberar';
    case 'SALE':
      return 'no hay stock reservado suficiente para confirmar la venta';
    default:
      return 'stock insuficiente';
  }
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async stockLevels(variantId: string): Promise<StockLevelView[]> {
    await this.ensureVariantExists(variantId);
    const levels = await this.prisma.stockLevel.findMany({
      where: { variantId },
      orderBy: { location: 'asc' },
    });
    return levels.map(toStockLevelView);
  }

  async movements(
    variantId: string,
    query: MovementListQuery,
  ): Promise<MovementPage> {
    await this.ensureVariantExists(variantId);
    const where = {
      variantId,
      ...(query.type ? { type: query.type } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      items: items.map(toStockMovementView),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /** Ingreso de mercadería: aumenta stock físico disponible (RECEIPT). */
  receive(variantId: string, body: MovementBody): Promise<LedgerResult> {
    return this.runInTransaction((tx) =>
      this.applyMovement(tx, variantId, 'RECEIPT', body.quantity, body),
    );
  }

  /** Ajuste por conteo/baja: delta con signo, motivo obligatorio. */
  adjust(variantId: string, body: AdjustBody): Promise<LedgerResult> {
    return this.runInTransaction((tx) =>
      this.applyMovement(tx, variantId, body.type, body.delta, body),
    );
  }

  /** Reserva unidades (en los pedidos por WhatsApp); guarda stock real. */
  reserve(variantId: string, body: MovementBody): Promise<LedgerResult> {
    return this.runInTransaction((tx) =>
      this.applyMovement(tx, variantId, 'RESERVATION', body.quantity, body),
    );
  }

  /** Libera una reserva que venció o se canceló. */
  release(variantId: string, body: MovementBody): Promise<LedgerResult> {
    return this.runInTransaction((tx) =>
      this.applyMovement(tx, variantId, 'RELEASE', -body.quantity, body),
    );
  }

  /** Descuenta de onHand y reserved la venta confirmada (POS/web). */
  commit(variantId: string, body: MovementBody): Promise<LedgerResult> {
    return this.runInTransaction((tx) =>
      this.applyMovement(tx, variantId, 'SALE', -body.quantity, body),
    );
  }

  /** Confirma una venta POS ya reservada en la misma transacción. */
  commitIn(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    location: StockLocation,
    reason: string,
    refId: string,
  ): Promise<LedgerResult> {
    return this.applyMovement(tx, variantId, 'SALE', -quantity, {
      location,
      reason,
      refId,
    });
  }

  /**
   * Ingreso de mercadería para componer dentro de OTRA transacción (ej. alta
   * de producto con stock inicial en el mismo commit, plan §4.5).
   */
  receiptIn(
    tx: Prisma.TransactionClient,
    variantId: string,
    location: StockLocation,
    quantity: number,
    reason: string,
    refId?: string,
    userId?: string,
  ): Promise<LedgerResult> {
    return this.applyMovement(tx, variantId, 'RECEIPT', quantity, {
      location,
      reason,
      refId,
      userId,
    });
  }

  reserveIn(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    location: StockLocation,
    reason: string,
    refId: string,
  ): Promise<LedgerResult> {
    return this.applyMovement(tx, variantId, 'RESERVATION', quantity, {
      location,
      reason,
      refId,
    });
  }

  releaseIn(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
    location: StockLocation,
    reason: string,
    refId: string,
  ): Promise<LedgerResult> {
    return this.applyMovement(tx, variantId, 'RELEASE', -quantity, {
      location,
      reason,
      refId,
    });
  }

  private runInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(operation);
  }

  private async ensureVariantExists(variantId: string): Promise<void> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }
  }

  private async applyMovement(
    tx: Prisma.TransactionClient,
    variantId: string,
    type: StockMovementType,
    delta: number,
    input: MovementInput,
  ): Promise<LedgerResult> {
    try {
      assertDeltaSign(type, delta);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const variant = await tx.variant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const levelKey = {
      variantId_location: { variantId, location: input.location },
    };
    const existing = await tx.stockLevel.findUnique({ where: levelKey });
    const current = existing ?? { onHand: 0, reserved: 0 };

    if (!capacityIsSatisfied(current, type, delta)) {
      throw new ConflictException(conflictMessageFor(type));
    }

    if (existing) {
      const impact = applyEffectToLevel(
        { onHand: 0, reserved: 0 },
        type,
        delta,
      );
      const needsAtomicGuard = impact.reserved !== 0 || impact.onHand < 0;
      if (needsAtomicGuard) {
        const moved = await this.applyGuardedLevelChange(
          tx,
          variantId,
          input.location,
          type,
          delta,
          impact,
        );
        if (!moved) {
          throw new ConflictException(conflictMessageFor(type));
        }
      } else {
        await tx.stockLevel.update({
          where: levelKey,
          data: { onHand: { increment: impact.onHand } },
        });
      }
    } else {
      const impact = applyEffectToLevel(current, type, delta);
      await tx.stockLevel.create({
        data: {
          variantId,
          location: input.location,
          onHand: impact.onHand,
          reserved: impact.reserved,
        },
      });
    }

    const level = await tx.stockLevel.findUniqueOrThrow({ where: levelKey });
    const movement = await tx.stockMovement.create({
      data: {
        variantId,
        delta,
        type,
        reason: input.reason,
        location: input.location,
        refId: input.refId,
        userId: input.userId,
      },
    });

    return {
      movement: toStockMovementView(movement),
      stock: toStockLevelView(level),
    };
  }

  /**
   * Aplica la mutación atómica de `stock_levels` con su predicado de guarda.
   * Para RESERVATION y SALE el guard compara dos columnas de la misma fila,
   * algo que Prisma no expresa en `where`, así que va por SQL (plan §4.3:
   * el descuento es atómico para impedir sobreventa entre POS y web).
   */
  private async applyGuardedLevelChange(
    tx: Prisma.TransactionClient,
    variantId: string,
    location: StockLocation,
    type: StockMovementType,
    delta: number,
    impact: { onHand: number; reserved: number },
  ): Promise<boolean> {
    const qty = Math.abs(delta);

    switch (type) {
      case 'RESERVATION':
        return (
          (await tx.$queryRaw<unknown[]>`
            UPDATE "StockLevel"
            SET "reserved" = "reserved" + ${impact.reserved}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${variantId}
              AND "location" = ${location}::"StockLocation"
              AND ("onHand" - "reserved") >= ${delta}
            RETURNING 1
          `).length > 0
        );
      case 'SALE':
        return (
          (await tx.$queryRaw<unknown[]>`
            UPDATE "StockLevel"
            SET "onHand" = "onHand" + ${impact.onHand},
                "reserved" = "reserved" + ${impact.reserved},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${variantId}
              AND "location" = ${location}::"StockLocation"
              AND "reserved" >= ${qty}
              AND "onHand" >= ${qty}
            RETURNING 1
          `).length > 0
        );
      case 'RELEASE':
        return (
          (await tx.$queryRaw<unknown[]>`
            UPDATE "StockLevel"
            SET "reserved" = "reserved" + ${impact.reserved}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${variantId}
              AND "location" = ${location}::"StockLocation"
              AND "reserved" >= ${qty}
            RETURNING 1
          `).length > 0
        );
      default:
        return (
          (await tx.$queryRaw<unknown[]>`
            UPDATE "StockLevel"
            SET "onHand" = "onHand" + ${impact.onHand}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "variantId" = ${variantId}
              AND "location" = ${location}::"StockLocation"
              AND "onHand" >= ${qty}
            RETURNING 1
          `).length > 0
        );
    }
  }
}