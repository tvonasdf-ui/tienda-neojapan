import Link from 'next/link';
import { unstable_noStore } from 'next/cache';
import {
  AdminProductListResponse,
  CONDITION_LABELS,
  formatCLP,
  LOCATION_LABELS,
  STATUS_LABELS,
} from '@/lib/api';
import { apiFetch } from '@/lib/server-api';
import { Badge, Button, Card } from '@neojapan/ui';

export const instant = false;

export default async function InventarioPage() {
  unstable_noStore();
  let data: AdminProductListResponse | null = null;
  let error: string | null = null;

  try {
    data = await apiFetch<AdminProductListResponse>('/admin/products?limit=100');
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'No se pudo conectar con la API.';
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-gray-100">Inventario</h1>
          <p className="text-gray-400">
            Catálogo con stock por variante y sucursal. El libro de movimientos es
            inmutable (plan §4.3).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/inventario/importar">
            <Button variant="secondary" size="sm">
              Importar CSV
            </Button>
          </Link>
          <Link href="/inventario/nuevo">
            <Button size="sm">Nueva alta</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Card className="p-6">
          <Badge tone="danger">Sin conexión</Badge>
          <p className="mt-3 text-gray-300">{error}</p>
          <p className="mt-1 text-sm text-gray-500">
            Levanta la API en el puerto 3002 y vuelve a recargar.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Variante</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-800/60 last:border-0 hover:bg-gray-900/60"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-100">{product.name}</div>
                    <div className="font-mono text-xs text-gray-500">{product.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {product.category}
                    <div className="text-xs text-gray-500">{product.platform}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={product.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {STATUS_LABELS[product.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center gap-2 font-mono text-xs"
                        >
                          <Badge tone="neutral">{CONDITION_LABELS[variant.condition]}</Badge>
                          <span className="text-gray-300">{variant.sku}</span>
                          {Object.entries(variant.stock).map(([location, level]) =>
                            level && level.onHand > 0 ? (
                              <span key={location} className="text-gray-500">
                                {LOCATION_LABELS[location as keyof typeof LOCATION_LABELS]}:{' '}
                                {level.onHand}
                              </span>
                            ) : null,
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {product.variants.length > 0
                      ? formatCLP(product.variants[0].price)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.variants.reduce(
                      (sum, v) =>
                        sum +
                        Object.values(v.stock).reduce(
                          (acc, level) => acc + (level?.onHand ?? 0),
                          0,
                        ),
                      0,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/inventario/${product.id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Editar
                      </Link>
                      {product.variants.length > 0 ? (
                        <Link
                          href={`/inventario/${product.variants[0].id}/movimientos`}
                          className="text-sm text-cyan-400 hover:text-cyan-300"
                        >
                          Movimientos
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!data && !error ? null : (data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay productos todavía. Usa «Nueva alta» o «Importar CSV» para
                    comenzar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}