import { SalesReport } from '@/components/reportes/sales-report';

export default function ReportesPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gray-100">Reportes</h1>
        <p className="text-gray-400">Resumen financiero y evolución de ventas por canal.</p>
      </div>
      <SalesReport />
    </section>
  );
}