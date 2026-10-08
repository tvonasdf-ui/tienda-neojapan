import Image from 'next/image';
import Link from 'next/link';
import { formatCLP, productImage, type ProductSummary } from '@/lib/catalog';

export function ProductCard({ product, compatibleConsoleId }: { product: ProductSummary; compatibleConsoleId?: string }) {
  const variant = product.variants[0];
  const compatibility = product.compatibilities?.find((item) => item.consoleModelId === compatibleConsoleId);
  return (
    <article className="product-card">
      <Link href={`/producto/${product.slug}`} aria-label={`Ver ${product.name}`}>
        <div className="product-image">
          <Image src={productImage(product.media?.publicId)} alt={product.media?.alt ?? product.name} fill sizes="(max-width: 680px) 45vw, (max-width: 900px) 30vw, 22vw" />
          {variant ? <span className="image-code">{variant.sku}</span> : null}
        </div>
        <div className="product-card-info">
          <div className="product-meta"><span>{product.platform}</span><span>{product.category}</span></div>
          {compatibility ? <span className={`tag compatibility-badge ${compatibility.level === 'CONFIRMED' ? 'tag-success' : ''}`}>{compatibility.level === 'CONFIRMED' ? 'Compatibilidad confirmada' : 'Revisar compatibilidad'}</span> : null}
          <strong className="product-title">{product.name}</strong>
          <div className="product-price-line">
            <span>{variant ? formatCLP(variant.price) : 'Consultar'}</span>
            {variant ? <span className="tag">{variant.condition === 'NEW' ? 'Nuevo' : `Grado ${variant.condition}`}</span> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
