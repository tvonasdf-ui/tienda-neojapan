import { describe, expect, it } from 'vitest';
import {
  Condition,
  RepairStatus,
  SaleChannel,
  repairCode,
  repairTicketSchema,
  saleSchema,
  stockMovementSchema,
  variantSchema,
  shortCode,
  slug,
  orderRequestSchema,
  cartItemRequestSchema,
} from './index';

describe('enums de dominio', () => {
  it.each(['NEW', 'A', 'B', 'C'] as const)('acepta condición %s', (value) => {
    expect(Condition.safeParse(value).success).toBe(true);
  });

  it('rechaza condición desconocida', () => {
    expect(Condition.safeParse('AAA').success).toBe(false);
  });

  it('rechaza canal de venta desconocido', () => {
    expect(SaleChannel.safeParse('EBAY').success).toBe(false);
  });
});

describe('primitivas', () => {
  it('hace parse del código corto NJ-XXXX', () => {
    expect(shortCode.parse('NJ-0001')).toBe('NJ-0001');
  });

  it('rechaza códigos cortos malformados', () => {
    expect(shortCode.safeParse('NJ-42').success).toBe(false);
    expect(shortCode.safeParse('ABC-0001').success).toBe(false);
  });

  it('valida slugs kebab-case', () => {
    expect(slug.parse('joystick-switch-oled')).toBe('joystick-switch-oled');
    expect(slug.safeParse('Joystick Switch').success).toBe(false);
  });
});

describe('variantSchema', () => {
  it('valida una variante con condición y precios en CLP', () => {
    const result = variantSchema.safeParse({
      id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10a',
      productId: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10b',
      sku: 'SW-JOY-A1',
      condition: 'A',
      price: 24990,
      cost: 12800,
      createdAt: '2026-10-07T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza precios negativos', () => {
    expect(
      variantSchema.safeParse({
        id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10a',
        productId: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10b',
        sku: 'SW-JOY-A1',
        condition: 'A',
        price: -1,
        cost: 0,
        createdAt: '2026-10-07T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('stockMovementSchema', () => {
  it('exige motivo en todo movimiento', () => {
    const base = {
      id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10c',
      variantId: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10d',
      delta: -1,
      type: 'SALE' as const,
      location: 'STORE' as const,
    };
    expect(stockMovementSchema.safeParse(base).success).toBe(false);
    expect(
      stockMovementSchema.safeParse({ ...base, reason: 'venta en mostrador' })
        .success,
    ).toBe(true);
  });
});

describe('saleSchema', () => {
  it('default de estado REQUESTED y cero en descuento/envío', () => {
    const sale = saleSchema.parse({
      id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10e',
      code: 'NJ-1042',
      channel: 'ONLINE' as const,
      subtotal: 24990,
      total: 24990,
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T12:00:00.000Z',
    });

    expect(sale.status).toBe('REQUESTED');
    expect(sale.discountAmount).toBe(0);
    expect(sale.shippingAmount).toBe(0);
    expect(sale.currency).toBe('CLP');
  });
});

describe('contratos de la tienda', () => {
  const cartId = '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10a';

  it('exige comuna para despacho, pero no para retiro', () => {
    const base = {
      cartId,
      customerName: 'Ana Pérez',
      customerPhone: '+56912345678',
      deliveryMode: 'PICKUP' as const,
    };
    expect(orderRequestSchema.safeParse(base).success).toBe(true);
    expect(orderRequestSchema.safeParse({ ...base, deliveryMode: 'DISPATCH' }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, deliveryMode: 'DISPATCH', dispatchCommune: 'Ñuñoa' }).success).toBe(true);
  });

  it('limita cantidades válidas para el carrito', () => {
    const line = { variantId: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10b', quantity: 1 };
    expect(cartItemRequestSchema.safeParse(line).success).toBe(true);
    expect(cartItemRequestSchema.safeParse({ ...line, quantity: 0 }).success).toBe(false);
    expect(cartItemRequestSchema.safeParse({ ...line, quantity: 21 }).success).toBe(false);
  });
});

describe('servicio técnico', () => {
  it('acepta el ciclo RepairStatus completo', () => {
    for (const status of [
      'RECEIVED',
      'DIAGNOSED',
      'QUOTED',
      'APPROVED',
      'IN_REPAIR',
      'READY',
      'DELIVERED',
      'CANCELLED',
      'UNCLAIMED',
    ] as const) {
      expect(RepairStatus.safeParse(status).success).toBe(true);
    }
    expect(RepairStatus.safeParse('PENDING').success).toBe(false);
  });

  it('valida códigos SR-XXXX para tickets de reparación', () => {
    expect(repairCode.parse('SR-0001')).toBe('SR-0001');
    expect(repairCode.safeParse('NJ-0001').success).toBe(false);
    expect(repairCode.safeParse('SR-42').success).toBe(false);
  });

  it('abre un ticket con status RECEIVED por defecto', () => {
    const ticket = repairTicketSchema.parse({
      id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10f',
      code: 'SR-0001',
      customerName: 'María González',
      customerPhone: '+56912345678',
      deviceName: 'Nintendo Switch OLED',
      faultDescription: 'Drift en el joycon.',
      createdAt: '2026-10-08T12:00:00.000Z',
      updatedAt: '2026-10-08T12:00:00.000Z',
    });

    expect(ticket.status).toBe('RECEIVED');
    expect(ticket.quoteAmount).toBeUndefined();
  });

  it('rechaza un ticket sin descripción de la falla', () => {
    expect(
      repairTicketSchema.safeParse({
        id: '4d5a0cd7-f9e4-43e8-a6f9-c4e0b7f2d10f',
        code: 'SR-0001',
        customerName: 'María González',
        customerPhone: '+56912345678',
        deviceName: 'Nintendo Switch OLED',
        createdAt: '2026-10-08T12:00:00.000Z',
        updatedAt: '2026-10-08T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});