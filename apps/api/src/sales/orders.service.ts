import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, StockLocation } from '@prisma/client';
import { applyPercentageDiscount, buildWhatsAppOrderMessage, computeCartTotals, shippingCost } from '@neojapan/pricing';
import { randomInt } from 'node:crypto';
import type { OrderRequest } from '@neojapan/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import type { CreatePosSaleBody } from './orders.dtos';

export interface OrderLineView {
  name: string;
  sku: string;
  condition: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderRecord {
  id: string;
  code: string;
  channel: string;
  status: string;
  customerId: string | null;
  clientSaleId: string | null;
  deliveryMode: string;
  reservationExpiresAt: Date | null;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingAmount: number;
  total: number;
  dispatchCommune: string | null;
  createdAt: Date;
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private expirationTimer: NodeJS.Timeout | undefined;
  private expirationInProgress = false;
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.expirationTimer = setInterval(() => {
      if (this.expirationInProgress) return;
      this.expirationInProgress = true;
      void this.prisma
        .$transaction((tx) => this.releaseExpired(tx))
        .catch((error: unknown) => {
          this.logger.error(
            'No se pudieron liberar las reservas vencidas.',
            error instanceof Error ? error.stack : String(error),
          );
        })
        .finally(() => {
          this.expirationInProgress = false;
        });
    }, 30_000);
  }

  onModuleDestroy(): void {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async create(input: OrderRequest) {
    const number = this.config.get<string>('STORE_WHATSAPP_NUMBER');
    if (!number) {
      throw new ServiceUnavailableException('La tienda aún no configuró su número de WhatsApp.');
    }
    const order = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpired(tx);
      const existing = await tx.sale.findUnique({
        where: { clientSaleId: input.cartId },
      }) as OrderRecord | null;
      if (existing) {
        if (existing.status !== 'REQUESTED') {
          throw new ConflictException('Este carrito ya fue enviado; inicia una nueva solicitud.');
        }
        return { record: existing, lines: await this.getLines(tx, existing.id), customerName: await this.getCustomerName(tx, existing.customerId) };
      }

      const cartLines = await tx.cartItem.findMany({
        where: { cartId: input.cartId },
        select: { variantId: true, quantity: true },
      }) as Array<{ variantId: string; quantity: number }>;
      if (!cartLines.length) throw new BadRequestException('El carrito está vacío o venció.');
      const items: Array<{ variantId: string; quantity: number; unitPrice: number; unitCost: number; label: string; condition: string; sku: string }> = [];
      for (const requested of cartLines) {
        const variant = await tx.variant.findUnique({
          where: { id: requested.variantId },
          select: { id: true, productId: true, sku: true, condition: true, price: true, cost: true },
        });
        if (!variant) throw new NotFoundException('Una variante del carrito ya no existe.');
        const product = await tx.product.findUnique({
          where: { id: variant.productId },
          select: { name: true, status: true },
        });
        if (!product || product.status !== 'ACTIVE') {
          throw new ConflictException('Un producto del carrito ya no está disponible.');
        }
        items.push({
          variantId: variant.id,
          quantity: requested.quantity,
          unitPrice: variant.price,
          unitCost: variant.cost,
          label: `${product.name} (condición ${variant.condition})`,
          condition: variant.condition,
          sku: variant.sku,
        });
      }

      const shippingAmount = shippingCost({
        mode: input.deliveryMode,
        dispatchBasePrice: this.config.get<number>('DISPATCH_BASE_PRICE') ?? 0,
      });
      const totals = computeCartTotals({ lines: items, shippingAmount });
      const discountAmount = input.couponCode
        ? this.calculateCouponDiscount(input.couponCode, totals.subtotal)
        : 0;
      let customer = await tx.customer.findFirst({
        where: { phone: input.customerPhone },
        select: { id: true, name: true },
      }) as { id: string; name: string } | null;
      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { name: input.customerName },
          select: { id: true, name: true },
        }) as { id: string; name: string };
      } else {
        customer = await tx.customer.create({
          data: { name: input.customerName, phone: input.customerPhone },
          select: { id: true, name: true },
        }) as { id: string; name: string };
      }

      const code = await this.generateCode(tx);
      const sale = await tx.sale.create({
        data: {
          code,
          channel: 'ONLINE',
          status: 'REQUESTED',
          customerId: customer.id,
          clientSaleId: input.cartId,
          deliveryMode: input.deliveryMode,
          reservationExpiresAt: null,
          currency: 'CLP',
          subtotal: totals.subtotal,
          discountAmount,
          couponCode: input.couponCode ? this.configuredCouponCode() : null,
          shippingAmount: totals.shippingAmount,
          total: totals.total - discountAmount,
          dispatchCommune: input.deliveryMode === 'DISPATCH' ? input.dispatchCommune : null,
        },
      }) as OrderRecord;

      for (const item of items) {
        await tx.saleLine.create({
          data: {
            saleId: sale.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
          },
        });
      }
      await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });

      return {
        record: sale,
        customerName: customer.name,
        lines: items.map((item) => ({
          name: item.label,
          sku: item.sku,
          condition: item.condition,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        })),
      };
    });

    const message = buildWhatsAppOrderMessage({
      storeName: this.config.get<string>('STORE_NAME') ?? 'Neojapan',
      orderCode: order.record.code,
      items: order.lines.map((line) => ({ label: line.name, quantity: line.quantity, unitPrice: line.unitPrice })),
      total: order.record.total,
      modeLabel: order.record.deliveryMode === 'PICKUP' ? 'Retiro en tienda' : `Despacho${order.record.dispatchCommune ? ` a ${order.record.dispatchCommune}` : ''}`,
      customerName: order.customerName,
      orderUrl: `${this.storeBaseUrl()}/pedido/${order.record.code}`,
    });
    return {
      code: order.record.code,
      status: order.record.status,
      subtotal: order.record.subtotal,
      discountAmount: order.record.discountAmount,
      shippingAmount: order.record.shippingAmount,
      couponCode: order.record.couponCode,
      total: order.record.total,
      inventoryReserved: false,
      lines: order.lines,
      whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    };
  }

  async validateCoupon(cartId: string, couponCode: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      select: { variantId: true, quantity: true },
    }) as Array<{ variantId: string; quantity: number }>;
    if (!items.length) throw new BadRequestException('El carrito está vacío o venció.');
    const lines: Array<{ quantity: number; unitPrice: number }> = [];
    for (const item of items) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        select: { price: true, product: { select: { status: true } } },
      });
      if (!variant || variant.product.status !== 'ACTIVE') {
        throw new ConflictException('Un producto del carrito ya no está disponible.');
      }
      lines.push({ quantity: item.quantity, unitPrice: variant.price });
    }
    const subtotal = computeCartTotals({ lines, shippingAmount: 0 }).subtotal;
    const discountAmount = this.calculateCouponDiscount(couponCode, subtotal);
    return { couponCode: this.configuredCouponCode(), subtotal, discountAmount, total: subtotal - discountAmount };
  }

  async createPosSale(input: CreatePosSaleBody) {
    return this.prisma.$transaction(async (tx) => {
      const lineRows = await Promise.all(
        input.lines.map(async (line) => {
          const variant = await tx.variant.findUnique({
            where: { id: line.variantId },
            select: { id: true, sku: true, condition: true, price: true, cost: true, product: { select: { name: true, status: true } } },
          });
          if (!variant || variant.product.status !== 'ACTIVE') {
            throw new NotFoundException('Una variante del pedido no está disponible.');
          }
          const levels = await tx.stockLevel.findMany({
            where: { variantId: variant.id },
            select: { location: true, onHand: true, reserved: true },
          });
          const available = levels.reduce(
            (sum, level) => sum + Math.max(0, level.onHand - level.reserved),
            0,
          );
          if (available < line.quantity) {
            throw new ConflictException(`Stock insuficiente para ${variant.product.name}.`);
          }
          return {
            variant,
            line,
            available,
          };
        }),
      );

      const subtotal = lineRows.reduce(
        (sum, row) => sum + row.variant.price * row.line.quantity,
        0,
      );
      if (input.paymentAmount < subtotal) {
        throw new BadRequestException('El monto de pago no puede ser menor que el total.');
      }

      const code = await this.generateCode(tx);
      const sale = await tx.sale.create({
        data: {
          code,
          channel: 'POS',
          status: 'PAID',
          customerId: await this.ensureCustomer(tx, input.customerName, input.customerPhone),
          subtotal,
          discountAmount: 0,
          couponCode: null,
          shippingAmount: 0,
          total: subtotal,
          currency: 'CLP',
          customerNote: `Venta POS · método de pago: ${input.paymentMethod}`,
        },
      });

      for (const row of lineRows) {
        const requestedQuantity = row.line.quantity;
        let remaining = requestedQuantity;
        await tx.saleLine.create({
          data: {
            saleId: sale.id,
            variantId: row.variant.id,
            quantity: requestedQuantity,
            unitPrice: row.variant.price,
            unitCost: row.variant.cost,
          },
        });
        for (const level of await tx.stockLevel.findMany({
          where: { variantId: row.variant.id },
          select: { location: true, onHand: true, reserved: true },
        })) {
          const quantity = Math.min(
            remaining,
            Math.max(0, level.onHand - level.reserved),
          );
          if (quantity > 0) {
            await this.inventory.reserveIn(
              tx,
              row.variant.id,
              quantity,
              level.location,
              `Venta POS ${code}`,
              code,
            );
            await this.inventory.commitIn(
              tx,
              row.variant.id,
              quantity,
              level.location,
              `Venta POS ${code}`,
              code,
            );
            remaining -= quantity;
          }
        }
        if (remaining > 0) {
          throw new ConflictException(`Stock insuficiente para ${row.variant.product.name}.`);
        }
      }

      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: input.paymentMethod,
          amount: input.paymentAmount,
          reference: input.reference ?? null,
          status: 'PAID',
        },
      });

      return {
        code: sale.code,
        status: sale.status,
        subtotal,
        total: subtotal,
        lines: lineRows.map((row) => ({
          variantId: row.variant.id,
          sku: row.variant.sku,
          condition: row.variant.condition,
          quantity: row.line.quantity,
          unitPrice: row.variant.price,
          lineTotal: row.variant.price * row.line.quantity,
        })),
      };
    });
  }

  async detail(code: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpired(tx, code);
      const record = await tx.sale.findUnique({ where: { code } }) as OrderRecord | null;
      if (!record || record.channel !== 'ONLINE') throw new NotFoundException('Solicitud de pedido no encontrada.');
      return {
        record,
        customerName: await this.getCustomerName(tx, record.customerId),
        lines: await this.getLines(tx, record.id),
      };
    });
    return {
      code: order.record.code,
      status: order.record.status,
      deliveryMode: order.record.deliveryMode,
      dispatchCommune: order.record.dispatchCommune,
      subtotal: order.record.subtotal,
      discountAmount: order.record.discountAmount,
      shippingAmount: order.record.shippingAmount,
      total: order.record.total,
      createdAt: order.record.createdAt.toISOString(),
      reservationExpiresAt: order.record.reservationExpiresAt?.toISOString() ?? null,
      lines: order.lines,
    };
  }

  private async getLines(tx: Prisma.TransactionClient, saleId: string): Promise<OrderLineView[]> {
    const lines = await tx.saleLine.findMany({
      where: { saleId },
      orderBy: { createdAt: 'asc' },
      select: { variantId: true, quantity: true, unitPrice: true },
    }) as Array<{ variantId: string; quantity: number; unitPrice: number }>;
    const result: OrderLineView[] = [];
    for (const line of lines) {
      const variant = await tx.variant.findUnique({
        where: { id: line.variantId },
        select: { sku: true, condition: true, productId: true },
      }) as { sku: string; condition: string; productId: string } | null;
      if (!variant) throw new NotFoundException('Una variante de la solicitud ya no existe.');
      const product = await tx.product.findUnique({
        where: { id: variant.productId },
        select: { name: true },
      }) as { name: string } | null;
      if (!product) throw new NotFoundException('Un producto de la solicitud ya no existe.');
      result.push({
        name: `${product.name} (condición ${variant.condition})`,
        sku: variant.sku,
        condition: variant.condition,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.quantity * line.unitPrice,
      });
    }
    return result;
  }

  private async getCustomerName(tx: Prisma.TransactionClient, customerId: string | null): Promise<string> {
    if (!customerId) return 'Cliente';
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    }) as { name: string } | null;
    return customer?.name ?? 'Cliente';
  }

  private async ensureCustomer(
    tx: Prisma.TransactionClient,
    name: string,
    phone: string,
  ): Promise<string> {
    const existing = await tx.customer.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (existing) return existing.id;
    const customer = await tx.customer.create({
      data: { name, phone, email: null },
      select: { id: true },
    });
    return customer.id;
  }

  private async releaseExpired(tx: Prisma.TransactionClient, code?: string): Promise<void> {
    const requested = await tx.sale.findMany({
      where: { status: 'REQUESTED', ...(code ? { code } : {}) },
      select: { id: true, code: true, reservationExpiresAt: true },
    }) as Array<{ id: string; code: string; reservationExpiresAt: Date | null }>;
    const now = new Date();
    for (const sale of requested) {
      if (!sale.reservationExpiresAt || sale.reservationExpiresAt > now) continue;
      const movements = await tx.stockMovement.findMany({
        where: { type: 'RESERVATION', refId: sale.code },
        select: { variantId: true, delta: true, location: true },
      }) as Array<{ variantId: string; delta: number; location: StockLocation }>;
      for (const movement of movements) {
        if (movement.delta <= 0) continue;
        await this.inventory.releaseIn(
          tx,
          movement.variantId,
          movement.delta,
          movement.location,
          `Reserva vencida ${sale.code}`,
          sale.code,
        );
      }
      await tx.sale.update({ where: { id: sale.id }, data: { status: 'CANCELLED' } });
    }
  }

  private async generateCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `NJ-${randomInt(1000, 1_000_000)}`;
      const existing = await tx.sale.findUnique({ where: { code }, select: { id: true } });
      if (!existing) return code;
    }
    throw new ConflictException('No se pudo generar un código de pedido. Inténtalo otra vez.');
  }

  private reservationTtlMinutes(): number {
    return this.config.get<number>('RESERVATION_TTL_MINUTES') ?? 30;
  }

  private configuredCouponCode(): string {
    return (this.config.get<string>('STORE_COUPON_CODE') ?? '').trim().toUpperCase();
  }

  private calculateCouponDiscount(couponCode: string, subtotal: number): number {
    const configuredCode = this.configuredCouponCode();
    const percentage = this.config.get<number>('STORE_COUPON_PERCENT');
    if (!configuredCode || percentage === undefined || couponCode.trim().toUpperCase() !== configuredCode) {
      throw new BadRequestException('El código promocional no es válido.');
    }
    return applyPercentageDiscount(subtotal, percentage);
  }

  private storeBaseUrl(): string {
    return (this.config.get<string>('STORE_BASE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }
}
