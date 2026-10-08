import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { computeCartTotals } from '@neojapan/pricing';
import { PrismaService } from '../prisma/prisma.service';

interface CartLineRecord {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async get(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, select: { id: true } });
    if (!cart) await this.prisma.cart.create({ data: { id: cartId } });
    const storedLines = await this.prisma.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, cartId: true, variantId: true, quantity: true },
    }) as CartLineRecord[];
    const lines = [];
    for (const stored of storedLines) {
      const line = await this.toPublicLine(stored);
      lines.push(line);
    }
    const totals = computeCartTotals({
      lines: lines.map((line) => ({ unitPrice: line.price, quantity: line.quantity })),
    });
    return { id: cartId, items: lines, totals };
  }

  async add(cartId: string, variantId: string, addedQuantity: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureCart(tx, cartId);
      const variant = await this.getVariant(tx, variantId);
      const existing = await tx.cartItem.findFirst({
        where: { cartId, variantId },
      }) as CartLineRecord | null;
      const quantity = (existing?.quantity ?? 0) + addedQuantity;
      if (quantity > 20) throw new ConflictException('El límite por producto es 20 unidades.');
      await this.assertAvailable(tx, variantId, quantity);
      if (existing) {
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
      } else {
        await tx.cartItem.create({ data: { cartId, variantId, quantity } });
      }
      return { ok: true, itemCount: quantity, price: variant.price };
    });
  }

  async setQuantity(cartId: string, variantId: string, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({
        where: { cartId, variantId },
      }) as CartLineRecord | null;
      if (!existing) throw new NotFoundException('El producto ya no está en el carrito.');
      if (quantity === 0) {
        await tx.cartItem.deleteMany({ where: { id: existing.id } });
      } else {
        if (quantity > 20) throw new ConflictException('El límite por producto es 20 unidades.');
        await this.assertAvailable(tx, variantId, quantity);
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
      }
      return { ok: true };
    });
  }

  async remove(cartId: string, variantId: string) {
    const result = await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
    if (!result.count) throw new NotFoundException('El producto ya no está en el carrito.');
    return { ok: true };
  }

  private async ensureCart(tx: Prisma.TransactionClient, cartId: string) {
    const cart = await tx.cart.findUnique({ where: { id: cartId }, select: { id: true } });
    if (!cart) await tx.cart.create({ data: { id: cartId } });
  }

  private async getVariant(tx: Prisma.TransactionClient, variantId: string) {
    const variant = await tx.variant.findUnique({
      where: { id: variantId },
      select: { id: true, productId: true, price: true },
    });
    if (!variant) throw new NotFoundException('La variante seleccionada ya no existe.');
    const product = await tx.product.findUnique({
      where: { id: variant.productId },
      select: { status: true },
    });
    if (!product || product.status !== 'ACTIVE') throw new ConflictException('El producto no está disponible.');
    return variant;
  }

  private async assertAvailable(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
  ) {
    const levels = await tx.stockLevel.findMany({
      where: { variantId },
      select: { onHand: true, reserved: true },
    }) as Array<{ onHand: number; reserved: number }>;
    const available = levels.reduce((total, level) => total + level.onHand - level.reserved, 0);
    if (quantity > available) throw new ConflictException('No hay stock suficiente para esa cantidad.');
  }

  private async toPublicLine(stored: CartLineRecord) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: stored.variantId },
      select: { id: true, productId: true, sku: true, condition: true, price: true, stockLevels: { select: { onHand: true, reserved: true } } },
    }) as { id: string; productId: string; sku: string; condition: string; price: number; stockLevels: Array<{ onHand: number; reserved: number }> } | null;
    if (!variant) throw new NotFoundException('Una variante del carrito ya no existe.');
    const product = await this.prisma.product.findUnique({
      where: { id: variant.productId },
      select: { name: true, slug: true, platform: true, status: true, media: { where: { isPrimary: true }, take: 1, select: { publicId: true } } },
    }) as { name: string; slug: string; platform: string; status: string; media: Array<{ publicId: string }> } | null;
    if (!product || product.status !== 'ACTIVE') throw new ConflictException('Un producto del carrito ya no está publicado.');
    const available = variant.stockLevels.reduce((total, level) => total + level.onHand - level.reserved, 0);
    return {
      variantId: variant.id,
      quantity: stored.quantity,
      slug: product.slug,
      name: product.name,
      platform: product.platform,
      condition: variant.condition,
      sku: variant.sku,
      price: variant.price,
      image: product.media[0]?.publicId ?? null,
      available,
      lineTotal: variant.price * stored.quantity,
    };
  }
}
