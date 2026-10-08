import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell section">
      <section className="empty-state">
        <span className="eyebrow">404 / No encontrado</span>
        <h1 className="section-title">Esa página no existe.</h1>
        <p className="muted">La dirección no corresponde a una página de la tienda o el producto fue retirado del catálogo.</p>
        <Link className="button-primary" href="/catalogo">Ir al catálogo</Link>
      </section>
    </main>
  );
}