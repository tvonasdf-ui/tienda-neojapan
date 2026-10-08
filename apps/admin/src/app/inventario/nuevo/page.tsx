import Link from 'next/link';
import { ProductCreateForm } from '@/components/inventory/product-create-form';

export default function NuevaAltaPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/inventario" className="text-sm text-gray-400 hover:text-gray-200">
          ← Inventario
        </Link>
        <h1 className="font-display text-2xl text-gray-100">Nueva alta</h1>
        <p className="text-gray-400">
          Producto con variantes por condición y su stock inicial (se registra como
          ingreso en el libro de movimientos).
        </p>
      </div>
      <ProductCreateForm />
    </section>
  );
}