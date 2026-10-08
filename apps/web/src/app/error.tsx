'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="page-shell section">
      <section className="empty-state">
        <span className="eyebrow">Error / 500</span>
        <h1 className="section-title">Algo se interrumpió.</h1>
        <p className="muted">Ocurrió un error inesperado al cargar esta página. Inténtalo de nuevo o vuelve al catálogo.</p>
        <div className="order-actions">
          <button className="button-primary" type="button" onClick={() => reset()}>Intentar de nuevo</button>
          <Link className="button-secondary" href="/catalogo">Ir al catálogo</Link>
        </div>
      </section>
    </main>
  );
}