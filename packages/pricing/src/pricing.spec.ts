import { describe, expect, it } from 'vitest';
import {
  applyPercentageDiscount,
  buildWhatsAppOrderMessage,
  computeCartTotals,
  formatCLP,
  lineTotal,
  shippingCost,
} from './index';

describe('formatCLP', () => {
  it('formatea montos según es-CL', () => {
    expect(formatCLP(24990)).toBe('$24.990');
  });
});

describe('lineTotal', () => {
  it('multiplica precio × cantidad', () => {
    expect(lineTotal({ unitPrice: 24990, quantity: 2 })).toBe(49980);
  });

  it('rechaza cantidades no positivas', () => {
    expect(() => lineTotal({ unitPrice: 100, quantity: 0 })).toThrow();
  });

  it('rechaza precios negativos', () => {
    expect(() => lineTotal({ unitPrice: -1, quantity: 1 })).toThrow();
  });
});

describe('computeCartTotals', () => {
  it('calcula subtotal y total sin extras', () => {
    const totals = computeCartTotals({
      lines: [
        { unitPrice: 10000, quantity: 1 },
        { unitPrice: 5000, quantity: 2 },
      ],
    });
    expect(totals.subtotal).toBe(20000);
    expect(totals.discountAmount).toBe(0);
    expect(totals.shippingAmount).toBe(0);
    expect(totals.total).toBe(20000);
  });

  it('aplica descuento y envío', () => {
    const totals = computeCartTotals({
      lines: [{ unitPrice: 30000, quantity: 1 }],
      discountAmount: 3000,
      shippingAmount: 4500,
    });
    expect(totals.total).toBe(31500);
  });

  it('rechaza descuento mayor al subtotal', () => {
    expect(() =>
      computeCartTotals({
        lines: [{ unitPrice: 1000, quantity: 1 }],
        discountAmount: 5000,
      }),
    ).toThrow();
  });
});

describe('applyPercentageDiscount', () => {
  it('redondea al entero más cercano', () => {
    expect(applyPercentageDiscount(9990, 10)).toBe(999);
  });

  it('rechaza porcentajes fuera de 0-100', () => {
    expect(() => applyPercentageDiscount(1000, 101)).toThrow();
    expect(() => applyPercentageDiscount(1000, -1)).toThrow();
  });
});

describe('shippingCost', () => {
  it('retiro en tienda siempre cuesta 0', () => {
    expect(shippingCost({ mode: 'PICKUP', dispatchBasePrice: 4500 })).toBe(0);
  });

  it('despacho cobra la base configurada', () => {
    expect(shippingCost({ mode: 'DISPATCH', dispatchBasePrice: 4500 })).toBe(
      4500,
    );
  });
});

describe('buildWhatsAppOrderMessage', () => {
  it('arma el mensaje del pedido en español', () => {
    const message = buildWhatsAppOrderMessage({
      storeName: 'Neojapan',
      orderCode: 'NJ-1042',
      items: [
        { label: 'Joystick de repuesto Switch OLED (condición A)', quantity: 1, unitPrice: 24990 },
        { label: 'Pack de inicio retro', quantity: 1, unitPrice: 19990 },
      ],
      total: 44980,
      modeLabel: 'Retiro en tienda',
      customerName: 'Nombre Apellido',
      orderUrl: 'https://neojapan.cl/pedido/NJ-1042',
    });

    expect(message).toContain('Hola Neojapan, quiero hacer este pedido (NJ-1042):');
    expect(message).toContain('*1x* Joystick de repuesto Switch OLED (condición A) - $24.990');
    expect(message).toContain('*Total:* $44.980');
    expect(message).toContain('*Modalidad:* Retiro en tienda');
    expect(message).toContain('*Nombre:* Nombre Apellido');
    expect(message).toContain('https://neojapan.cl/pedido/NJ-1042');
  });

  it('muestra precio por unidad y total cuando hay cantidad > 1', () => {
    const message = buildWhatsAppOrderMessage({
      storeName: 'Neojapan',
      orderCode: 'NJ-1043',
      items: [{ label: 'Trigger Switch OLED', quantity: 3, unitPrice: 2000 }],
      total: 6000,
      modeLabel: 'Despacho',
      customerName: 'Ana Pérez',
      orderUrl: 'https://neojapan.cl/pedido/NJ-1043',
    });
    expect(message).toContain('*3x* Trigger Switch OLED - $2.000 c/u • $6.000');
  });

  it('resume pedidos extensos y preserva el enlace al detalle completo', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      label: `Pieza ${index + 1}`,
      quantity: 1,
      unitPrice: 1000,
    }));
    const message = buildWhatsAppOrderMessage({
      storeName: 'Neojapan',
      orderCode: 'NJ-123456',
      items,
      total: 12000,
      modeLabel: 'Retiro en tienda',
      customerName: 'Ana\nPérez',
      orderUrl: 'https://neojapan.cl/pedido/NJ-123456',
    });

    expect(message).toContain('… y 4 producto(s) más.');
    expect(message).not.toContain('Pieza 12');
    expect(message).toContain('Nombre:* Ana Pérez');
    expect(message).toContain('https://neojapan.cl/pedido/NJ-123456');
  });
});