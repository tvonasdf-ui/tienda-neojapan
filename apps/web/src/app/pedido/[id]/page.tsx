import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { formatCLP } from '@/lib/catalog-shared';

export const instant = false;

export const metadata: Metadata = { title: 'Detalle del pedido', robots: { index: false, follow: false } };

interface OrderDetail {
  code: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
  customerName: string;
  deliveryMode: 'PICKUP' | 'DISPATCH';
  dispatchCommune: string | null;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  createdAt: string;
  reservationExpiresAt: string | null;
  lines: Array<{ name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }>;
}

async function getOrder(code: string): Promise<OrderDetail | null> {
  const base = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002').replace(/\/$/, '').replace(/\/api\/v1$/, '');
  const response = await fetch(`${base}/api/v1/orders/${encodeURIComponent(code)}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`No se pudo consultar el pedido (${response.status}).`);
  return response.json() as Promise<OrderDetail>;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^NJ-\d{4,}$/.test(id)) notFound();
  const order = await getOrder(id);
  if (!order) notFound();
  const statusLabels: Record<OrderDetail['status'], string> = {
    REQUESTED: 'Solicitud recibida',
    CONFIRMED: 'Pedido confirmado',
    PAID: 'Pedido pagado',
    CANCELLED: 'Solicitud cancelada',
  };
  return (
    <main className="page-shell section order-detail-page">
      <span className="eyebrow">Pedido / {order.code}</span>
      <div className="order-heading"><div><h1 className="section-title">Detalle de solicitud.</h1><p className="muted small">Creado el {new Date(order.createdAt).toLocaleString('es-CL')}</p></div><span className="status-pill" data-status={order.status}>{statusLabels[order.status]}</span></div>
      {order.status === 'REQUESTED' ? <p className="notice">Esta solicitud no reserva ni descuenta inventario. El equipo confirmará la disponibilidad manualmente por WhatsApp.</p> : null}
      {order.status === 'CONFIRMED' ? <p className="notice">El equipo confirmó esta solicitud y actualizó el inventario. Coordina el pago y la entrega por WhatsApp.</p> : null}
      {order.status === 'CANCELLED' ? <p className="notice">La solicitud fue cancelada. Vuelve al catálogo para consultar disponibilidad actual y enviar una nueva solicitud.</p> : order.reservationExpiresAt ? <p className="notice">Este pedido anterior mantiene una reserva hasta {new Date(order.reservationExpiresAt).toLocaleString('es-CL')}.</p> : null}
      <section className="order-lines surface-card" aria-label="Artículos del pedido">{order.lines.map((line) => <div className="summary-row" key={line.sku}><span>{line.quantity} × {line.name}<br /><small className="mono-label">{line.sku}</small></span><strong>{formatCLP(line.lineTotal)}</strong></div>)}</section>
      <section className="summary-card order-totals"><div className="summary-row"><span>Subtotal</span><strong>{formatCLP(order.subtotal)}</strong></div>{order.discountAmount > 0 ? <div className="summary-row"><span>Descuento</span><strong>−{formatCLP(order.discountAmount)}</strong></div> : null}<div className="summary-row"><span>Despacho</span><span>{order.deliveryMode === 'PICKUP' ? 'Retiro en tienda' : `Por coordinar · ${order.dispatchCommune ?? ''}`}</span></div><div className="summary-row summary-total"><span>Total</span><strong>{formatCLP(order.total)}</strong></div></section>
      <Link className="button-secondary" href="/catalogo">Volver a la tienda</Link>
    </main>
  );
}
