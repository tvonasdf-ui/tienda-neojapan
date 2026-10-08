/**
 * Lógica pura de pricing — sin inyección de dependencias, testeable sin DB.
 * Totalmente en enteros CLP (no usamos flotantes para dinero).
 */

export interface MoneyInput {
  amount: number;
}

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatea un monto CLP según la convención local (es-CL). */
export function formatCLP(amount: number): string {
  return CLP_FORMATTER.format(amount);
}

export interface LineTotalsInput {
  unitPrice: number;
  quantity: number;
}

/** Total de una línea de venta (precio unitario × cantidad). */
export function lineTotal({ unitPrice, quantity }: LineTotalsInput): number {
  if (!Number.isInteger(unitPrice) || unitPrice < 0) {
    throw new Error(`unitPrice inválido: ${unitPrice}`);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`quantity inválido: ${quantity}`);
  }
  return unitPrice * quantity;
}

export interface CartTotalsInput {
  lines: ReadonlyArray<LineTotalsInput>;
  discountAmount?: number;
  shippingAmount?: number;
}

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
}

/**
 * Totales de un carrito. El subtotal nunca puede dar negativo tras el
 * descuento; el total = subtotal - descuento + envío.
 */
export function computeCartTotals({
  lines,
  discountAmount = 0,
  shippingAmount = 0,
}: CartTotalsInput): CartTotals {
  const subtotal = lines.reduce((acc, line) => acc + lineTotal(line), 0);
  if (!Number.isInteger(discountAmount) || discountAmount < 0) {
    throw new Error(`discountAmount inválido: ${discountAmount}`);
  }
  if (!Number.isInteger(shippingAmount) || shippingAmount < 0) {
    throw new Error(`shippingAmount inválido: ${shippingAmount}`);
  }
  if (discountAmount > subtotal) {
    throw new Error('el descuento no puede superar el subtotal');
  }
  return {
    subtotal,
    discountAmount,
    shippingAmount,
    total: subtotal - discountAmount + shippingAmount,
  };
}

/** Descuento porcentual (0–100). Aplicado sobre el subtotal. */
export function applyPercentageDiscount(subtotal: number, percent: number): number {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error(`percent inválido: ${percent}`);
  }
  return Math.round((subtotal * percent) / 100);
}

export type DeliveryMode = 'PICKUP' | 'DISPATCH';

export interface ShippingInput {
  mode: DeliveryMode;
  dispatchBasePrice: number;
}

/**
 * Costo de envío por modalidad. Retiro en tienda = 0; despacho usa base
 * configurable (puede refinarse luego con zonas/comunas como datos).
 */
export function shippingCost({ mode, dispatchBasePrice }: ShippingInput): number {
  if (mode === 'PICKUP') return 0;
  if (!Number.isInteger(dispatchBasePrice) || dispatchBasePrice < 0) {
    throw new Error(`dispatchBasePrice inválido: ${dispatchBasePrice}`);
  }
  return dispatchBasePrice;
}