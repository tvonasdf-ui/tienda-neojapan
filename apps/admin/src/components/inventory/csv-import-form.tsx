'use client';

import { useState, type FormEvent } from 'react';
import { Badge, Button, Card } from '@neojapan/ui';
import { clientFormApi, CsvImportSummary } from '@/lib/api';

export function CsvImportForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportSummary | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    const file = input.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Selecciona un archivo CSV.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const summary = await clientFormApi<CsvImportSummary>(
        '/admin/products/import-csv',
        input,
      );
      setResult(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo importar el archivo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="file" className="mb-1 block text-sm font-medium text-gray-200">
              Archivo CSV
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-gray-200 file:hover:bg-gray-700"
            />
            <p className="mt-1 text-sm text-gray-400">
              Una fila por variante. Columnas: slug, name, category, platform, sku,
              condition, price, cost, y opcionales: description, status, barcode,
              initialSTORE, initialWAREHOUSE, consoleModelId, compatibilityLevel,
              compatibilitySource, publicId.
            </p>
          </div>

          {error ? (
            <div>
              <Badge tone="danger">Error</Badge>
              <p className="mt-2 text-sm text-gray-300">{error}</p>
            </div>
          ) : null}

          <Button type="submit" loading={submitting}>
            Importar catálogo
          </Button>
        </form>
      </Card>

      {result ? (
        <Card className="p-6">
          <Badge tone={result.errors.length > 0 ? 'warning' : 'success'}>
            {result.errors.length > 0 ? 'Importación parcial' : 'Importación completa'}
          </Badge>
          <p className="mt-3 text-gray-200">{result.detail}</p>

          {result.errors.length > 0 ? (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4 font-medium">Fila</th>
                  <th className="py-2 pr-4 font-medium">Slug</th>
                  <th className="py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((entry) => (
                  <tr key={`${entry.row}-${entry.slug}`} className="border-b border-gray-800/60 last:border-0">
                    <td className="py-2 pr-4 font-mono text-gray-400">{entry.row}</td>
                    <td className="py-2 pr-4 font-mono text-gray-300">{entry.slug || '—'}</td>
                    <td className="py-2 text-red-300">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}