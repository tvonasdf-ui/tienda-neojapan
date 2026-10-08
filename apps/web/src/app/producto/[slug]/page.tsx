import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/product-gallery';
import { ProductPurchasePanel } from '@/components/product-purchase-panel';
import { getProduct, productImage } from '@/lib/catalog';

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Producto no encontrado' };
  return {
    title: product.name,
    description: product.description ?? `${product.name} con compatibilidad y condición verificadas en Neojapan.`,
    openGraph: { images: product.media[0] ? [productImage(product.media[0].publicId, 1200)] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const primary = product.media.find((media) => media.isPrimary) ?? product.media[0];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.media.map((media) => productImage(media.publicId, 1200)),
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: 'Neojapan' },
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      priceCurrency: 'CLP',
      price: variant.price,
      availability: variant.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      sku: variant.sku,
      itemCondition: variant.condition === 'NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    })),
  };

  return (
    <main className="page-shell">
      <nav className="breadcrumb mono-label" aria-label="Migas de pan"><a href="/catalogo">CATÁLOGO</a><span aria-hidden="true"> / </span><span>{product.category.toUpperCase()}</span></nav>
      <div className="product-detail">
        <ProductGallery media={product.media.map((media) => ({ src: productImage(media.publicId), alt: media.alt ?? product.name }))} fallback={productImage(primary?.publicId)} name={product.name} />
        <div className="product-detail-copy">
          <span className="eyebrow">{product.platform} / {product.category}</span>
          <h1>{product.name}</h1>
          <p className="lead">{product.description ?? 'Producto revisado por el equipo Neojapan.'}</p>
          <ProductPurchasePanel product={product} image={productImage(primary?.publicId)} />
          <section className="info-block" aria-labelledby="compatibility-title">
            <span className="mono-label">MATRIZ VERIFICADA</span>
            <h2 className="filter-heading" id="compatibility-title">Compatibilidad</h2>
            {product.compatibility.length ? (
              <table className="compat-table">
                <thead><tr><th>Consola / modelo</th><th>Estado</th><th>Fuente</th></tr></thead>
                <tbody>{product.compatibility.map((entry) => <tr key={`${entry.consoleModel.name}-${entry.source}`}><td>{entry.consoleModel.name}</td><td><span className={entry.level === 'CONFIRMED' ? 'tag tag-success' : 'tag'}>{entry.level === 'CONFIRMED' ? 'Confirmada' : 'Revisar'}</span></td><td>{entry.source}</td></tr>)}</tbody>
              </table>
            ) : <p className="muted small">Aún no hay una revisión de compatibilidad publicada para este producto.</p>}
            <p className="notice">¿No sabes qué modelo tienes? El <a className="accent-text" href="/garage">Console Garage</a> te ayuda a identificarlo.</p>
          </section>
          <section className="info-block">
            <span className="mono-label">ESTADO Y GARANTÍA</span>
            <p className="muted small">La condición corresponde a la unidad real fotografiada. Todo repuesto se revisa antes de publicarse. Consulta al equipo por cobertura antes de instalar piezas.</p>
          </section>
          <p className="mono-label">REF / {product.variants[0]?.sku ?? product.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  );
}
