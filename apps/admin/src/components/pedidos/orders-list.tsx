"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@neojapan/ui";
import { clientApi, formatCLP } from "@/lib/api";

interface Sale {
  id: string;
  code: string;
  channel: "ONLINE" | "POS";
  status: "REQUESTED" | "CONFIRMED" | "PAID" | "CANCELLED";
  customerName: string;
  deliveryMode: string;
  total: number;
  createdAt: string;
  lines: Array<{
    sku: string;
    condition: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const STATUS_TONES: Record<
  Sale["status"],
  "neutral" | "success" | "warning" | "danger"
> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  PAID: "success",
  CANCELLED: "danger",
};

const STATUS_LABELS: Record<Sale["status"], string> = {
  REQUESTED: "Solicitado",
  CONFIRMED: "Confirmado",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

export function OrdersList() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  useEffect(() => {
    clientApi<{ items: Sale[] }>("/admin/sales")
      .then((payload) => setSales(payload.items))
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar los pedidos.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(sale: Sale, status: Sale["status"]) {
    setUpdatingCode(sale.code);
    setError(null);
    try {
      await clientApi(`/admin/sales/${sale.code}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSales((current) =>
        current.map((item) =>
          item.code === sale.code ? { ...item, status } : item,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se pudo actualizar el pedido ${sale.code}: ${cause.message}`
          : `No se pudo actualizar el pedido ${sale.code}.`,
      );
    } finally {
      setUpdatingCode(null);
    }
  }

  if (loading) return <Card className="p-6">Cargando pedidos…</Card>;
  if (error && sales.length === 0)
    return <Card className="p-6 text-red-400">{error}</Card>;

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}
      <Card className="overflow-x-auto border border-white/[0.07] bg-[#111821] p-0">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-gray-800 last:border-0"
              >
                <td className="px-4 py-3">
                  <strong>{sale.code}</strong>
                  <div className="text-xs text-gray-500">
                    {new Date(sale.createdAt).toLocaleString("es-CL")}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {sale.customerName}
                  <div className="text-xs text-gray-500">
                    {sale.lines.length} líneas
                  </div>
                </td>
                <td className="px-4 py-3">
                  {sale.channel === "ONLINE" ? "Online" : "POS"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[sale.status]}>
                    {STATUS_LABELS[sale.status]}
                  </Badge>
                  {sale.channel === "ONLINE" && sale.status === "REQUESTED" ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Sin reserva · confirmar descuenta inventario
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono">{formatCLP(sale.total)}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Estado del pedido ${sale.code}`}
                    disabled={updatingCode !== null}
                    value={sale.status}
                    onChange={(event) =>
                      updateStatus(sale, event.target.value as Sale["status"])
                    }
                    className="rounded bg-gray-800 px-2 py-1 text-sm"
                  >
                    <option value={sale.status}>{STATUS_LABELS[sale.status]}</option>
                    {sale.channel === "ONLINE" && sale.status === "REQUESTED" ? (
                      <>
                        <option value="CONFIRMED">Confirmar y descontar stock</option>
                        <option value="CANCELLED">Cancelar solicitud</option>
                      </>
                    ) : null}
                    {sale.channel === "ONLINE" && sale.status === "CONFIRMED" ? (
                      <option value="PAID">Marcar pagado</option>
                    ) : null}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay pedidos.</div>
        ) : null}
      </Card>
    </div>
  );
}
