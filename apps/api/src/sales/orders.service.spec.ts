import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from './orders.service';
import { AdminSalesService } from './admin-sales.service';

describe('storefront checkout', () => {
  it('registra la solicitud sin tocar inventario y descuenta stock al confirmarla', async () => {
    const values: Record<string, string | number> = {
      DATA_STORE: 'memory',
      STORE_NAME: 'Neojapan',
      STORE_WHATSAPP_NUMBER: '56912345678',
      STORE_BASE_URL: 'https://neojapan.cl',
      RESERVATION_TTL_MINUTES: '30',
      STORE_COUPON_CODE: 'BIENVENIDA',
      STORE_COUPON_PERCENT: 10,
    };
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    const prisma = new PrismaService(config);
    const inventory = new InventoryService(prisma);
    const carts = new CartService(prisma);
    const orders = new OrdersService(prisma, inventory, config);
    const adminSales = new AdminSalesService(prisma, inventory);
    const variant = await prisma.variant.findUnique({
      where: { sku: 'SW-JOY-A1' },
      select: { id: true },
    }) as { id: string };
    const cartId = 'b324c84f-b99e-437c-9d66-9fb20d1b0ed8';

    await carts.add(cartId, variant.id, 1);
    const storedCart = await carts.get(cartId);
    expect(storedCart.items[0]).toMatchObject({ variantId: variant.id, price: 24990, quantity: 1 });
    const before = await inventory.stockLevels(variant.id);
    const input = {
      cartId,
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      deliveryMode: 'PICKUP',
      couponCode: 'BIENVENIDA',
    } as const;
    const result = await orders.create(input);
    const after = await inventory.stockLevels(variant.id);
    const detail = await orders.detail(result.code);
    const retry = await orders.create(input);
    const savedSale = await prisma.sale.findUnique({
      where: { code: result.code },
      select: { couponCode: true, discountAmount: true },
    });

    expect(result.total).toBe(22491);
    expect(result.discountAmount).toBe(2499);
    expect(result.whatsappUrl).toContain('https://wa.me/56912345678?text=');
    expect(after).toEqual(before);
    expect(detail).toMatchObject({
      code: result.code,
      status: 'REQUESTED',
      total: 22491,
      lines: [{ quantity: 1, unitPrice: 24990 }],
    });
    expect(detail).not.toHaveProperty('customerName');
    expect(retry.code).toBe(result.code);
    expect(savedSale).toEqual({ couponCode: 'BIENVENIDA', discountAmount: 2499 });
    await adminSales.updateStatus(result.code, 'CONFIRMED');
    const confirmed = await inventory.stockLevels(variant.id);
    expect(confirmed.reduce((total, level) => total + level.onHand, 0)).toBe(
      before.reduce((total, level) => total + level.onHand, 0) - 1,
    );
    expect(confirmed.reduce((total, level) => total + level.reserved, 0)).toBe(
      before.reduce((total, level) => total + level.reserved, 0),
    );
    await adminSales.updateStatus(result.code, 'CONFIRMED');
    expect(await inventory.stockLevels(variant.id)).toEqual(confirmed);
  });

  it('confirma una venta POS con stock, pago y auditoría de la transacción', async () => {
    const values: Record<string, string | number> = {
      DATA_STORE: 'memory',
      STORE_NAME: 'Neojapan',
      STORE_WHATSAPP_NUMBER: '56912345678',
      STORE_BASE_URL: 'https://neojapan.cl',
      RESERVATION_TTL_MINUTES: '30',
    };
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    const prisma = new PrismaService(config);
    const inventory = new InventoryService(prisma);
    const orders = new OrdersService(prisma, inventory, config);
    const variant = await prisma.variant.findUnique({
      where: { sku: 'SW-JOY-A1' },
      select: { id: true, price: true, cost: true },
    }) as { id: string; price: number; cost: number };
    const before = await inventory.stockLevels(variant.id);

    const result = await orders.createPosSale({
      lines: [{ variantId: variant.id, quantity: 1 }],
      paymentMethod: 'CASH',
      paymentAmount: variant.price,
      reference: 'PRUEBA-POS',
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
    });

    const sale = await prisma.sale.findUnique({
      where: { code: result.code },
      include: { lines: true, payments: true },
    });
    const after = await inventory.stockLevels(variant.id);

    expect(sale).toMatchObject({
      code: result.code,
      channel: 'POS',
      status: 'PAID',
      subtotal: variant.price,
      total: variant.price,
    });
    expect(sale?.lines).toEqual([
      expect.objectContaining({
        variantId: variant.id,
        quantity: 1,
        unitPrice: variant.price,
        unitCost: variant.cost,
      }),
    ]);
    expect(sale?.payments).toEqual([
      expect.objectContaining({
        method: 'CASH',
        amount: variant.price,
        status: 'PAID',
        reference: 'PRUEBA-POS',
      }),
    ]);
    expect(after.reduce((sum, level) => sum + level.onHand, 0)).toBe(
      before.reduce((sum, level) => sum + level.onHand, 0) - 1,
    );
    expect(after.reduce((sum, level) => sum + level.reserved, 0)).toBe(
      before.reduce((sum, level) => sum + level.reserved, 0),
    );
  });

  it('rechaza un código promocional inválido al validarlo para el carrito', async () => {
    const values: Record<string, string | number> = {
      DATA_STORE: 'memory',
      STORE_WHATSAPP_NUMBER: '56912345678',
      STORE_COUPON_CODE: 'BIENVENIDA',
      STORE_COUPON_PERCENT: 10,
    };
    const config = { get: (key: string) => values[key] } as unknown as ConfigService;
    const prisma = new PrismaService(config);
    const inventory = new InventoryService(prisma);
    const carts = new CartService(prisma);
    const orders = new OrdersService(prisma, inventory, config);
    const variant = await prisma.variant.findUnique({
      where: { sku: 'SW-JOY-A1' },
      select: { id: true },
    }) as { id: string };
    const cartId = '06326647-2902-4a2c-a467-5fb06c1a1e25';
    await carts.add(cartId, variant.id, 1);

    await expect(orders.validateCoupon(cartId, 'NO-EXISTE')).rejects.toThrow('no es válido');
    const before = await inventory.stockLevels(variant.id);
    await expect(orders.create({
      cartId,
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      deliveryMode: 'PICKUP',
      couponCode: 'NO-EXISTE',
    })).rejects.toThrow('no es válido');
    expect(await carts.get(cartId)).toMatchObject({ items: [{ variantId: variant.id, quantity: 1 }] });
    expect(await inventory.stockLevels(variant.id)).toEqual(before);
  });

  it('no confirma una solicitud si ya no queda inventario disponible', async () => {
    const values: Record<string, string | number> = {
      DATA_STORE: 'memory',
      STORE_NAME: 'Neojapan',
      STORE_WHATSAPP_NUMBER: '56912345678',
      STORE_BASE_URL: 'https://neojapan.cl',
    };
    const config = { get: (key: string) => values[key] } as unknown as ConfigService;
    const prisma = new PrismaService(config);
    const inventory = new InventoryService(prisma);
    const carts = new CartService(prisma);
    const orders = new OrdersService(prisma, inventory, config);
    const adminSales = new AdminSalesService(prisma, inventory);
    const variant = await prisma.variant.findUnique({
      where: { sku: 'SW-JOY-A1' },
      select: { id: true },
    }) as { id: string };
    const cartId = 'e1cbf6bc-5465-4592-9123-1e8e9b2e8ed1';
    await carts.add(cartId, variant.id, 1);
    const request = await orders.create({
      cartId,
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      deliveryMode: 'PICKUP',
    });
    const levels = await inventory.stockLevels(variant.id);
    for (const level of levels) {
      if (level.available > 0) {
        await inventory.adjust(variant.id, {
          location: level.location,
          delta: -level.available,
          reason: 'Prueba de disponibilidad agotada',
          type: 'LOSS',
        });
      }
    }
    expect((await inventory.stockLevels(variant.id)).reduce((sum, level) => sum + level.available, 0)).toBe(0);

    await expect(adminSales.updateStatus(request.code, 'CONFIRMED')).rejects.toThrow(
      'Stock insuficiente',
    );
    expect((await prisma.sale.findUnique({
      where: { code: request.code },
      select: { status: true },
    }))?.status).toBe('REQUESTED');
  });
});
