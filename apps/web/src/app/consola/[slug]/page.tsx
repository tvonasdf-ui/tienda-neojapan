import Link from 'next/link';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { getConsoles, getProductCount, getProducts } from '@/lib/catalog';

export const instant = false;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const consoles = await getConsoles();
  const model = consoles.find((item) => slugify(item.name) === slug);
  return { title: model ? `${model.name} — juegos y repuestos compatibles` : 'Consola no encontrada' };
}

export default async function ConsolePage({ params, searchParams }: Props) {
  await connection();
  const [{ slug }, queryParams] = await Promise.all([params, searchParams]);
  const consoles = await getConsoles();
  const model = consoles.find((item) => slugify(item.name) === slug);
  if (!model) notFound();
  const requestedPage = Math.max(1, Number.parseInt(typeof queryParams.page === 'string' ? queryParams.page : '', 10) || 1);
  const query = new URLSearchParams({ limit: '24', compatibleConsoleId: model.id });
  const total = await getProductCount(query.toString());
  const pageCount = Math.max(1, Math.ceil(total / 24));
  const page = Math.min(requestedPage, pageCount);
  query.set('offset', String((page - 1) * 24));
  const products = await getProducts(query.toString());

  return (
    <main className="page-shell">
      <nav className="breadcrumb mono-label" aria-label="Migas de pan"><Link className="breadcrumb-link" href="/catalogo">CATÁLOGO</Link><span aria-hidden="true"> / </span><span>CONSOLAS / {model.name.toUpperCase()}</span></nav>
      <header className="catalog-top console-hero">
        <div><span className="eyebrow">Console hub / {model.platform}</span><h1 className="section-title">{model.name}</h1><p className="muted small">{model.revision ? `Modelo de referencia ${model.revision}.` : 'Explora juegos, piezas y accesorios asociados a esta consola.'} Compatibilidad declarada y revisada por Neojapan.</p></div>
        <Link className="button-secondary" href={`/garage?console=${encodeURIComponent(model.id)}`}>Guardar en mi Garage</Link>
      </header>
      <section className="section-tight">
        <div className="section-heading"><div><span className="eyebrow">Matriz compatible</span><h2 className="section-title">Piezas para {model.name}.</h2></div><span className="mono-label">{total} PRODUCTOS</span></div>
        {products.length ? <div className="product-grid">{products.map((product) => <ProductCard product={product} compatibleConsoleId={model.id} key={product.id} />)}</div> : <div className="empty-state"><h2>Estamos verificando el catálogo.</h2><p className="muted">Todavía no hay productos asociados a este modelo. Las etiquetas indican qué compatibilidades están confirmadas y cuáles requieren revisión.</p><Link className="button-secondary" href="/catalogo">Ver todo el catálogo</Link></div>}
        {total > 24 ? <nav className="catalog-pagination" aria-label="Paginación de productos compatibles">
          {page > 1 ? <Link className="button-secondary" href={consolePageHref(page - 1)}>← Anterior</Link> : <span />}
          <span className="mono-label">PÁGINA {page} DE {pageCount}</span>
          {page < pageCount ? <Link className="button-secondary" href={consolePageHref(page + 1)}>Siguiente →</Link> : <span />}
        </nav> : null}
      </section>
    </main>
  );
}

function consolePageHref(page: number): string {
  return `?page=${page}`;
}
