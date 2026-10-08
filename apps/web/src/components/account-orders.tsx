'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';

const ORDERS_KEY = 'neojapan-orders-v1';

export function AccountOrders() {
  const snapshot = useSyncExternalStore(
    (callback) => {
      window.addEventListener('neojapan-orders-change', callback);
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener('neojapan-orders-change', callback);
        window.removeEventListener('storage', callback);
      };
    },
    () => localStorage.getItem(ORDERS_KEY) ?? '[]',
    () => '[]',
  );
  const codes = useMemo(() => {
    try {
      const value: unknown = JSON.parse(snapshot);
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && /^NJ-\d{4,}$/.test(item)) : [];
    } catch {
      return [];
    }
  }, [snapshot]);
  return (
    <section className="surface-card account-orders">
      <span className="mono-label">HISTORIAL EN ESTE DISPOSITIVO</span>
      <h2 className="section-title">Tus solicitudes.</h2>
      {codes.length ? <ul className="order-code-list">{codes.map((code) => <li key={code}><Link className="text-link" href={`/pedido/${code}`}>{code}<span aria-hidden="true">↗</span></Link></li>)}</ul> : <p className="muted small">Los pedidos que envíes desde este navegador aparecerán aquí.</p>}
    </section>
  );
}
