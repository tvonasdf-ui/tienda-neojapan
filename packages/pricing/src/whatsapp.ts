import { formatCLP } from './totals';

export interface WhatsAppOrderItem {
  /** Texto visible del ítem, ej. "Joystick de repuesto Switch OLED (condición A)". */
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface WhatsAppOrderInput {
  storeName: string;
  orderCode: string;
  items: ReadonlyArray<WhatsAppOrderItem>;
  total: number;
  modeLabel: string;
  customerName: string;
  orderUrl: string;
}

/**
 * Arma el mensaje de WhatsApp (es-CL) del pedido. El SERVIDOR lo genera con
 * precios vigentes; el navegador solo lo despliega (ver plan §3.6).
 */
export function buildWhatsAppOrderMessage(input: WhatsAppOrderInput): string {
  const header = `Hola ${singleLine(input.storeName)}, quiero hacer este pedido (${input.orderCode}):`;

  const maxItemLines = 8;
  const lines = input.items.slice(0, maxItemLines).map((item) => {
    const totalLine = lineTotalToMessage(item.quantity, item.unitPrice);
    return `*${item.quantity}x* ${singleLine(item.label).slice(0, 120)} - ${totalLine}`;
  });
  if (input.items.length > maxItemLines) {
    lines.push(`… y ${input.items.length - maxItemLines} producto(s) más. Revisa el detalle en el enlace.`);
  }

  return [
    header,
    '',
    ...lines,
    '',
    `*Total:* ${formatCLP(input.total)}`,
    `*Modalidad:* ${singleLine(input.modeLabel)}`,
    `*Nombre:* ${singleLine(input.customerName)}`,
    `*Detalle:* ${input.orderUrl}`,
  ]
    .join('\n')
    .trimEnd();
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function lineTotalToMessage(quantity: number, unitPrice: number): string {
  const line = quantity * unitPrice;
  return line === unitPrice
    ? formatCLP(unitPrice)
    : `${formatCLP(unitPrice)} c/u • ${formatCLP(line)}`;
}