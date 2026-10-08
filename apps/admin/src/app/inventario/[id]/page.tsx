import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card } from '@neojapan/ui';
import { ApiError, CONDITION_LABELS, formatDate } from '@/lib/api';
import type { AdminProductDetail } from '@/lib/api';
import { apiFetch } from '@/lib/server-api';
import { ProductEditForm } from '@/components/inventory/product-edit-form';
import { ProductMediaUpload } from '@/components/inventory/product-media-upload';

export const instant = false;

export default async function ProductoAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: AdminProductDetail;
  try {
    product = await apiFetch<AdminProductDetail>(`/admin/products/${id}`);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) {
      notFound();
    }
    return (
      <Card className="space-y-3 p-6">
        <Badge tone="danger">No se pudo cargar el producto</Badge>
        <p className="text-sm text-gray-300">
          {cause instanceof Error ? cause.message : 'Error desconocido.'}
        </p>
        <Link href="/inventario" className="text-sm text-cyan-400 hover:text-cyan-300">
          Volver al inventario
        </Link>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/inventario" className="text-sm text-gray-400 hover:text-gray-200">
          ← Inventario
        </Link>
        <h1 className="font-display text-2xl text-gray-100">{product.name}</h1>
        <p className="text-sm text-gray-400">
          {product.slug} · actualizado {formatDate(product.updatedAt)}
        </p>
      </div>

      <ProductEditForm product={product} />
      <ProductMediaUpload
        productId={product.id}
        productName={product.name}
        media={product.media}
      />

      <Card className="p-6">
        <h2 className="font-display text-lg text-gray-100">Compatibilidad registrada</h2>
        {product.compatibility.length ? (
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            {product.compatibility.map((entry) => (
              <li key={entry.consoleModelId}>
                {entry.level === 'CONFIRMED' ? 'Confirmada' : 'Parcial'} · {entry.source}
                {entry.notes ? ` · ${entry.notes}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Sin compatibilidades registradas.</p>
        )}
        <p className="mt-4 text-xs text-gray-500">
          Variantes: {product.variants.map((variant) =>
            `${variant.sku} (${CONDITION_LABELS[variant.condition]})`,
          ).join(' · ')}
        </p>
      </Card>
    </section>
  );
}
