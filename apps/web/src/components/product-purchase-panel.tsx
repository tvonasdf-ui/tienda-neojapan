'use client';

import { useState } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { formatCLP, type ProductDetail } from '@/lib/catalog-shared';

export function ProductPurchasePanel({ product, image }: { product: ProductDetail; image: string }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const variant = product.variants.find((item) => item.id === variantId);
  return (
    <>
      <div className="variant-list" role="radiogroup" aria-label="Selecciona condición">
        {product.variants.map((item) => (
          <label className="variant-option" key={item.id}>
            <span className="inline-choice"><input type="radio" name="variant" value={item.id} checked={variantId === item.id} onChange={() => setVariantId(item.id)} /><span>{item.condition === 'NEW' ? 'Nuevo' : `Condición ${item.condition}`}</span><span className="mono-label">{item.sku}</span></span>
            <span>{formatCLP(item.price)}</span>
          </label>
        ))}
      </div>
      {variant ? (
        <div className="detail-actions">
          <AddToCartButton item={{ variantId: variant.id, slug: product.slug, name: product.name, platform: product.platform, condition: variant.condition, sku: variant.sku, price: variant.price, image }} disabled={variant.available < 1} />
          <span className="availability">{variant.available > 0 ? `${variant.available} disponible${variant.available === 1 ? '' : 's'}` : 'Agotado'}</span>
        </div>
      ) : <p className="notice">No hay variantes disponibles para este producto.</p>}
    </>
  );
}
