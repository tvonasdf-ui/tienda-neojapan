import Link from 'next/link';
import { CsvImportForm } from '@/components/inventory/csv-import-form';

export default function ImportarPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/inventario" className="text-sm text-gray-400 hover:text-gray-200">
          ← Inventario
        </Link>
        <h1 className="font-display text-2xl text-gray-100">Importar catálogo</h1>
        <p className="text-gray-400">
          Carga masiva desde CSV: crea productos, variantes y el stock inicial en
          una sola operación.
        </p>
      </div>
      <CsvImportForm />
    </section>
  );
}