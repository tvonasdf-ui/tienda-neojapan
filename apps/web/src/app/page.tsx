import Link from 'next/link';
import { connection } from 'next/server';
import { ProductCard } from '@/components/product-card';
import { getConsoles, getProducts } from '@/lib/catalog';

export const instant = false;

const categories = [
  { id: '01', label: 'Juegos retro', detail: 'Clásicos probados', href: '/catalogo?category=Juegos+retro' },
  { id: '02', label: 'Repuestos', detail: 'Piezas que sí encajan', href: '/catalogo?category=Repuestos' },
  { id: '03', label: 'Accesorios', detail: 'Setup completo', href: '/catalogo?category=Accesorios' },
  { id: '04', label: 'Consolas', detail: 'Hardware revisado', href: '/catalogo?category=Consolas' },
];

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function HomePage() {
  await connection();
  const [products, consoles] = await Promise.all([getProducts('limit=8'), getConsoles()]);

  return (
    <main>
      <section className="page-shell hero">
        <div className="hero-copy">
          <span className="eyebrow">Hardware, juegos y repuestos · Santiago</span>
          <h1 className="display-title">La pieza exacta.<br /><span className="accent-text">Sin adivinar.</span></h1>
          <p className="lead">Compatibilidad real para consolas que todavía tienen mucha vida. Piezas revisadas, condición transparente y stock que existe.</p>
          <Link className="button-primary" href="/catalogo">Explorar catálogo <span aria-hidden="true">↗</span></Link>
          <div className="hero-bottomline"><span>COMPATIBILIDAD VERIFICADA</span><span>STOCK REAL · CLP</span></div>
        </div>
        <div className="hero-art" aria-label="Identidad visual de la tienda Neojapan">
          <span className="hero-index">NJ / STORE SYSTEM 001</span>
          <div className="hero-product">
            <span className="hero-product-mark">NJ</span>
            <span className="hero-product-label">REPAIR · RESTORE · REPLAY</span>
          </div>
          <span className="hero-orbit-label">PRECISION PARTS / 2026</span>
        </div>
      </section>

      <section className="page-shell section-tight" aria-labelledby="categories-title">
        <div className="section-heading">
          <div><span className="eyebrow">01 / Explora</span><h2 className="section-title" id="categories-title">Encuentra lo que buscas.</h2></div>
          <span className="mono-label">CATÁLOGO CURADO · STOCK ÚNICO</span>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link className="category-tile" href={category.href} key={category.id}>
              <span className="category-num">NJ / {category.id}</span>
              <strong>{category.label}</strong>
              <span>{category.detail} <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell section" aria-labelledby="new-products-title">
        <div className="section-heading">
          <div><span className="eyebrow">02 / Recién llegados</span><h2 className="section-title" id="new-products-title">Piezas seleccionadas.</h2></div>
          <Link className="text-link" href="/catalogo">Ver catálogo completo <span aria-hidden="true">↗</span></Link>
        </div>
        {products.length ? <div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}</div> : <p className="notice">Estamos preparando el catálogo. Vuelve pronto para descubrir las primeras piezas.</p>}
      </section>

      <section className="page-shell section-tight" aria-labelledby="choose-console-title">
        <div className="console-strip">
          <div>
            <span className="eyebrow">03 / Tu setup</span>
            <h2 className="section-title" id="choose-console-title">Elige tu consola.</h2>
            <p className="muted small">Encuentra accesorios, juegos y piezas compatibles, sin cruzar los dedos.</p>
          </div>
          <Link className="button-secondary" href="/garage">Armar mi garage <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="console-list">
          {consoles.slice(0, 8).map((console) => (
            <Link className="console-chip" href={`/consola/${slugify(console.name)}`} key={console.id}>{console.name}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
