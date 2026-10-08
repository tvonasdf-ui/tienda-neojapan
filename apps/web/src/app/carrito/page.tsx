import type { Metadata } from 'next';
import { CartPage } from '@/components/cart-page';

export const metadata: Metadata = { title: 'Carrito', robots: { index: false } };

export default function CartRoute() {
  return <main className="page-shell section"><span className="eyebrow">Tu pedido / 01</span><h1 className="section-title">Carrito.</h1><p className="muted small">Edita cantidades antes de solicitar tu pedido.</p><div className="section-tight"><CartPage /></div></main>;
}
