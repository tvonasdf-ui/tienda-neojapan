'use client';

import { useEffect, useState } from 'react';
import { Badge, Card } from '@neojapan/ui';
import { clientApi, formatCLP } from '@/lib/api';

interface Report {
  totals: { all: number; paid: number; pending: number; cancelled: number };
  byChannel: { ONLINE: number; POS: number };
  recent: Array<{ date: string; total: number; sales: number }>;
}

export function SalesReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientApi<Report>('/admin/sales/report')
      .then(setReport)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte.'));
  }, []);

  if (error) return <Card className="p-6 text-red-400">{error}</Card>;
  if (!report) return <Card className="p-6">Cargando reportes…</Card>;

  const maxRecent = Math.max(...report.recent.map((item) => item.total), 1);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Ventas totales', report.totals.all],
          ['Ingresos pagados', report.totals.paid],
          ['Pendientes', report.totals.pending],
          ['Canceladas', report.totals.cancelled],
        ].map(([label, value]) => <Card key={label as string} className="p-5"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-2 font-display text-2xl">{formatCLP(value as number)}</p></Card>)}
      </div>
      <Card className="p-5">
        <h2 className="font-display text-lg">Ventas por canal</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(['ONLINE', 'POS'] as const).map((channel) => <div key={channel}><p className="text-sm text-gray-400">{channel === 'ONLINE' ? 'Pedido online' : 'Punto de venta'}</p><p className="mt-1 font-mono text-2xl">{formatCLP(report.byChannel[channel])}</p></div>)}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-lg">Evolución de las últimas siete jornadas</h2>
        <div className="mt-5 flex h-48 items-end gap-3">
          {report.recent.map((item) => <div key={item.date} className="flex h-full flex-1 flex-col justify-end"><div className="transition-all" style={{ height: `${Math.max(8, (item.total / maxRecent) * 100)}%`, background: item.total > 0 ? '#22d3ee' : '#334155' }} /><span className="mt-2 text-center font-mono text-xs text-gray-500">{item.date.slice(5)}</span></div>)}
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-5"><Badge tone="neutral">Resumen</Badge><p className="mt-3 text-gray-300">{report.recent.reduce((sum, item) => sum + item.sales, 0)} ventas registradas en las últimas siete jornadas.</p></Card>
        <Card className="p-5"><Badge tone="success">Estado</Badge><p className="mt-3 text-gray-300">Los datos se calculan desde la tabla de ventas y sus líneas, sin duplicar información.</p></Card>
      </div>
    </div>
  );
}
