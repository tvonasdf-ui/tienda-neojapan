import { OrdersList } from '@/components/pedidos/orders-list';

export default function PedidosPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gray-100">Pedidos online</h1>
        <p className="text-gray-400">Lista de solicitudes, estado y totals de cada pedido.</p>
      </div>
      <OrdersList />
    </section>
  );
}