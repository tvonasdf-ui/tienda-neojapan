'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Input } from '@neojapan/ui';
import { clientApi, LedgerResult, LOCATION_LABELS } from '@/lib/api';

const INITIAL_LOCATION = 'STORE';

export function StockActions({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<'receipt' | 'adjust'>('receipt');
  const [location, setLocation] = useState(INITIAL_LOCATION);
  const [quantity, setQuantity] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const payload =
      kind === 'receipt'
        ? { location, quantity: Number(quantity), reason }
        : { type: 'ADJUSTMENT', location, delta: Number(delta), reason };

    try {
      const result = await clientApi<LedgerResult>(
        kind === 'receipt'
          ? `/inventory/variants/${variantId}/movements/receipt`
          : `/inventory/variants/${variantId}/movements/adjust`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      setMessage({
        tone: 'success',
        text: `Movimiento registrado · stock en ${LOCATION_LABELS[result.stock.location]}: ${result.stock.available} disponibles.`,
      });
      setQuantity('');
      setDelta('');
      setReason('');
      router.refresh();
    } catch (cause) {
      setMessage({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'No se pudo registrar el movimiento.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-200">Movimiento de stock</span>
        <div className="flex rounded-lg border border-gray-700 p-0.5" role="group" aria-label="Tipo de movimiento">
          <button
            type="button"
            onClick={() => setKind('receipt')}
            aria-pressed={kind === 'receipt'}
            className={`rounded-md px-3 py-1 text-sm ${
              kind === 'receipt'
                ? 'bg-cyan-400 text-gray-950'
                : 'text-gray-300 hover:text-gray-100'
            }`}
          >
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setKind('adjust')}
            aria-pressed={kind === 'adjust'}
            className={`rounded-md px-3 py-1 text-sm ${
              kind === 'adjust'
                ? 'bg-cyan-400 text-gray-950'
                : 'text-gray-300 hover:text-gray-100'
            }`}
          >
            Ajuste
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4" noValidate>
        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-200">
            Ubicación
          </label>
          <select
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <option value="STORE">Tienda</option>
            <option value="WAREHOUSE">Bodega</option>
          </select>
        </div>

        {kind === 'receipt' ? (
          <Input
            label="Cantidad"
            type="number"
            min={1}
            step={1}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="5"
          />
        ) : (
          <Input
            label="Delta (con signo)"
            type="number"
            min={-99999}
            step={1}
            required
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            placeholder="-2"
            hint="Positivo suma, negativo resta;≠ 0"
          />
        )}

        <div className="sm:col-span-2">
          <Input
            label="Motivo (obligatorio)"
            required
            maxLength={240}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej: compra proveedor, conteo de inventario…"
          />
        </div>

        <div className="flex items-end">
          <Button type="submit" loading={submitting} fullWidth>
            {kind === 'receipt' ? 'Registrar ingreso' : 'Registrar ajuste'}
          </Button>
        </div>
      </form>

      {message ? (
        <div className="mt-4">
          <Badge tone={message.tone === 'success' ? 'success' : 'danger'}>
            {message.tone === 'success' ? 'Listo' : 'Error'}
          </Badge>
          <p className="mt-2 text-sm text-gray-300">{message.text}</p>
        </div>
      ) : null}
    </Card>
  );
}