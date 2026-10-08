import Link from 'next/link';
import { Badge, Card } from '@neojapan/ui';
import {
  formatDate,
  LOCATION_LABELS,
  MovementPageResponse,
  MOVEMENT_LABELS,
  StockLevelView,
} from '@/lib/api';
import { apiFetch } from '@/lib/server-api';
import { StockActions } from '@/components/inventory/stock-actions';

export const instant = false;

interface VariantMovementsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sku?: string }>;
}

export default async function VariantMovementsPage({
  params,
  searchParams,
}: VariantMovementsPageProps) {
  const { id: variantId } = await params;
  const { sku } = await searchParams;

  let movements: MovementPageResponse | null = null;
  let stockLevels: StockLevelView[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([
      apiFetch<MovementPageResponse>(
        `/inventory/variants/${variantId}/movements?limit=50`,
      ),
      apiFetch<StockLevelView[]>(`/inventory/variants/${variantId}/stock`),
    ]);
    movements = results[0];
    stockLevels = results[1];
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'No se pudo cargar la variante.';
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/inventario"
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          ← Inventario
        </Link>
        <h1 className="font-display text-2xl text-gray-100">
          Movimientos{sku ? ` · ${sku}` : ''}
        </h1>
        <p className="text-gray-400">
          Libro inmutable del stock: cada cambio queda registrado con motivo
          obligatorio.
        </p>
      </div>

      {error ? (
        <Card className="p-6">
          <Badge tone="danger">Sin conexión</Badge>
          <p className="mt-3 text-gray-300">{error}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {stockLevels.map((level) => (
              <Card key={level.location} className="p-4">
                <div className="text-sm text-gray-400">
                  {LOCATION_LABELS[level.location]}
                </div>
                <dl className="mt-2 space-y-1 font-mono text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Disponible</dt>
                    <dd className="text-gray-100">{level.available}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reservado</dt>
                    <dd className="text-amber-400">{level.reserved}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Físico</dt>
                    <dd className="text-gray-300">{level.onHand}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>

          <StockActions variantId={variantId} />

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Delta</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {(movements?.items ?? []).map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-gray-800/60 last:border-0 hover:bg-gray-900/60"
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          movement.type === 'SALE' || movement.type === 'LOSS'
                            ? 'danger'
                            : movement.type === 'RESERVATION'
                              ? 'warning'
                              : movement.type === 'RECEIPT' || movement.type === 'RETURN'
                                ? 'success'
                                : 'neutral'
                        }
                      >
                        {MOVEMENT_LABELS[movement.type]}
                      </Badge>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        movement.delta > 0 ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {movement.delta > 0 ? '+' : ''}
                      {movement.delta}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{movement.reason}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {LOCATION_LABELS[movement.location]}
                    </td>
                  </tr>
                ))}
                {(movements?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay movimientos registrados para esta variante.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </section>
  );
}