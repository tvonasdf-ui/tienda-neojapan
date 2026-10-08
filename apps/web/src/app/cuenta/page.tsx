import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountOrders } from '@/components/account-orders';
import { OrderLookup } from '@/components/order-lookup';

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="page-shell section">
      <span className="eyebrow">Neojapan / pedidos</span>
      <h1 className="section-title">Tu espacio.</h1>
      <p className="lead">Tus pedidos y consolas guardadas, a mano en este navegador.</p>
      <div className="account-grid">
        <AccountOrders />
        <section className="surface-card account-lookup"><span className="mono-label">CONSULTA UN ESTADO</span><h2 className="section-title">Buscar un pedido.</h2><p className="muted small">Si enviaste la solicitud desde otro navegador o teléfono, escríbela aquí.</p><OrderLookup /></section>
        <section className="surface-card account-garage"><span className="mono-label">COMPATIBILIDAD</span><h2 className="section-title">Console Garage.</h2><p className="muted small">Guarda tus consolas para consultar piezas y accesorios compatibles.</p><Link className="button-secondary" href="/garage">Abrir mi Garage</Link></section>
      </div>
      <p className="notice">La cuenta con inicio de sesión y sincronización entre dispositivos requiere autenticación de clientes, que aún no está habilitada. El historial y Garage actuales se guardan localmente en este navegador.</p>
    </main>
  );
}
