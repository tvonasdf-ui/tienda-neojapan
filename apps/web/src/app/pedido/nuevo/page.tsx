import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout-form';

export const metadata: Metadata = { title: 'Completar pedido', robots: { index: false } };

export default function NewOrderPage() {
  return <main className="page-shell section"><span className="eyebrow">Tu pedido / 02</span><h1 className="section-title">Coordina con nosotros.</h1><p className="muted small">Registramos tu solicitud antes de abrir WhatsApp. El inventario solo cambia cuando el equipo confirma manualmente la venta.</p><div className="section-tight"><CheckoutForm /></div></main>;
}
