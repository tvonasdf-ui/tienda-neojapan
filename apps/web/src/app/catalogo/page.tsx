import Link from 'next/link';
import { connection } from 'next/server';
import { ProductCard } from '@/components/product-card';
import { getConsoles, getProductCount, getProducts } from '@/lib/catalog';

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string): string {
  const entry = params[key];
  return typeof entry === 'string' ? entry : '';
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const q = value(params, 'q');
  const platform = value(params, 'platform');
  const category = value(params, 'category');
  const condition = value(params, 'condition');
  const min = value(params, 'minPrice');
  const max = value(params, 'maxPrice');
  const compatibleConsoleId = value(params, 'compatibleConsoleId');
  const requestedPage = Math.max(1, Number.parseInt(value(params, 'page'), 10) || 1);
  const query = new URLSearchParams({ limit: '24' });
  for (const [key, val] of Object.entries({ q, platform, category, condition, minPrice: min, maxPrice: max, compatibleConsoleId })) {
    if (val) query.set(key, val);
  }
  const [total, consoles] = await Promise.all([getProductCount(query.toString()), getConsoles()]);
  const pageCount = Math.max(1, Math.ceil(total / 24));
  const page = Math.min(requestedPage, pageCount);
  query.set('offset', String((page - 1) * 24));
  const products = await getProducts(query.toString());
  const platforms = [...new Set(products.map((product) => product.platform))].sort();
  const categories = [...new Set(products.map((product) => product.category))].sort();

  return (
    <main className="page-shell">
      <header className="catalog-top">
        <div><span className="eyebrow">Catálogo / 001</span><h1 className="section-title">Encuentra tu próxima pieza.</h1><p className="muted small">Productos reales, revisados y con compatibilidad clara. Elige tu consola para filtrar; “Confirmada” identifica compatibilidad verificada y “Revisar” indica que conviene consultarnos.</p></div>
        <span className="mono-label">{total} RESULTADOS</span>
      </header>
      <div className="catalog-layout">
        <aside className="filter-panel" aria-label="Filtros de catálogo">
          <h2 className="filter-heading">Filtrar resultados</h2>
          <form action="/catalogo" className="form-grid">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <div className="filter-group">
              <label className="filter-heading" htmlFor="filter-platform">Plataforma</label>
              <select className="select" id="filter-platform" name="platform" defaultValue={platform}><option value="">Todas</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <div className="filter-group">
              <label className="filter-heading" htmlFor="filter-category">Categoría</label>
              <select className="select" id="filter-category" name="category" defaultValue={category}><option value="">Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <div className="filter-group">
              <label className="filter-heading" htmlFor="filter-condition">Condición</label>
              <select className="select" id="filter-condition" name="condition" defaultValue={condition}><option value="">Cualquiera</option><option value="NEW">Nuevo</option><option value="A">Grado A</option><option value="B">Grado B</option><option value="C">Grado C</option></select>
            </div>
            <div className="filter-group">
              <label className="filter-heading" htmlFor="filter-console">Compatibilidad</label>
              <select className="select" id="filter-console" name="compatibleConsoleId" defaultValue={compatibleConsoleId}><option value="">Todas las consolas</option>{consoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </div>
            <div className="filter-group">
              <span className="filter-heading">Precio (CLP)</span>
              <input className="input" type="number" name="minPrice" min="0" placeholder="Desde" defaultValue={min} aria-label="Precio mínimo" />
              <input className="input" type="number" name="maxPrice" min="0" placeholder="Hasta" defaultValue={max} aria-label="Precio máximo" />
            </div>
            <button className="button-primary" type="submit">Aplicar filtros</button>
            <Link className="button-quiet" href="/catalogo">Limpiar filtros</Link>
          </form>
        </aside>
        <section className="catalog-products" aria-label="Productos">
          <div className="catalog-toolbar">
            <form className="search-form" action="/catalogo" role="search">
              <label className="sr-only" htmlFor="catalog-search">Buscar producto o consola</label>
              <input className="input" id="catalog-search" type="search" name="q" defaultValue={q} placeholder="Busca pieza, juego o consola…" />
              {platform ? <input type="hidden" name="platform" value={platform} /> : null}
              {category ? <input type="hidden" name="category" value={category} /> : null}
              {condition ? <input type="hidden" name="condition" value={condition} /> : null}
              {min ? <input type="hidden" name="minPrice" value={min} /> : null}
              {max ? <input type="hidden" name="maxPrice" value={max} /> : null}
              {compatibleConsoleId ? <input type="hidden" name="compatibleConsoleId" value={compatibleConsoleId} /> : null}
              <button className="button-secondary" type="submit">Buscar</button>
            </form>
            <span className="mono-label">MOSTRANDO {total ? (page - 1) * 24 + 1 : 0}–{Math.min(page * 24, total)} DE {total}</span>
          </div>
          {products.length ? <div className="product-grid">{products.map((product) => <ProductCard product={product} compatibleConsoleId={compatibleConsoleId || undefined} key={product.id} />)}</div> : (
            <div className="empty-state"><span className="eyebrow">Sin resultados</span><h2>No encontramos esa combinación.</h2><p className="muted">Prueba otra plataforma, condición o búsqueda.</p><Link className="button-secondary" href="/catalogo">Ver todo el catálogo</Link></div>
          )}
          {total > 24 ? <nav className="catalog-pagination" aria-label="Paginación del catálogo">
            {page > 1 ? <Link className="button-secondary" href={pageHref(params, page - 1)}>← Anterior</Link> : <span />}
            <span className="mono-label">PÁGINA {page} DE {pageCount}</span>
            {page < pageCount ? <Link className="button-secondary" href={pageHref(params, page + 1)}>Siguiente →</Link> : <span />}
          </nav> : null}
        </section>
      </div>
    </main>
  );
}

function pageHref(params: Record<string, string | string[] | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [key, entry] of Object.entries(params)) {
    if (key === 'page' || typeof entry !== 'string' || !entry) continue;
    query.set(key, entry);
  }
  query.set('page', String(page));
  return `/catalogo?${query.toString()}`;
}
