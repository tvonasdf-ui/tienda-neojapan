import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { Card } from "@neojapan/ui";
import type { AdminProductListResponse } from "@/lib/api";
import { formatCLP } from "@/lib/api";
import { apiFetch } from "@/lib/server-api";

export const instant = false;

interface SalesOverview {
  totals: {
    all: number;
    paid: number;
    pending: number;
    cancelled: number;
  };
  byChannel: { ONLINE: number; POS: number };
  recent: Array<{ date: string; total: number; sales: number }>;
}

function MetricCard({
  label,
  value,
  detail,
  index,
}: {
  label: string;
  value: string;
  detail: string;
  index: string;
}) {
  return (
    <Card className="relative overflow-hidden border border-white/[0.07] bg-[#111821] p-5 sm:p-6">
      <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-2xl" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-400">{label}</p>
        <span className="font-mono text-[10px] tracking-widest text-gray-600">
          {index}
        </span>
      </div>
      <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-gray-100 sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
    </Card>
  );
}

const quickActions = [
  {
    href: "/inventario/nuevo",
    number: "01",
    title: "Crear producto",
    detail: "Registrar un producto y sus variantes",
  },
  {
    href: "/inventario/importar",
    number: "02",
    title: "Importar catálogo",
    detail: "Cargar productos desde un archivo CSV",
  },
  {
    href: "/pos",
    number: "03",
    title: "Abrir punto de venta",
    detail: "Iniciar una venta en mostrador",
  },
  {
    href: "/pedidos",
    number: "04",
    title: "Revisar pedidos",
    detail: "Revisar solicitudes y confirmar ventas",
  },
] as const;

export default async function DashboardPage() {
  unstable_noStore();

  const [productsResult, salesResult] = await Promise.allSettled([
    apiFetch<AdminProductListResponse>("/admin/products?limit=100"),
    apiFetch<SalesOverview>("/admin/sales/report"),
  ]);

  const products =
    productsResult.status === "fulfilled" ? productsResult.value : null;
  const sales = salesResult.status === "fulfilled" ? salesResult.value : null;
  const errors = [
    productsResult.status === "rejected"
      ? productsResult.reason instanceof Error
        ? `Inventario: ${productsResult.reason.message}`
        : "Inventario: no se pudo cargar el resumen."
      : null,
    salesResult.status === "rejected"
      ? salesResult.reason instanceof Error
        ? `Ventas: ${salesResult.reason.message}`
        : "Ventas: no se pudo cargar el resumen."
      : null,
  ].filter((error): error is string => error !== null);

  const weekSales = sales?.recent.reduce((sum, day) => sum + day.sales, 0) ?? 0;
  const weekTotal = sales?.recent.reduce((sum, day) => sum + day.total, 0) ?? 0;
  const maxDailyTotal = Math.max(
    ...(sales?.recent.map((day) => day.total) ?? [0]),
    1,
  );

  return (
    <section className="space-y-8 sm:space-y-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">
            Centro de operaciones
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-50 sm:text-4xl">
            Resumen del negocio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Una vista clara del catálogo, los pedidos y la actividad reciente de
            la tienda.
          </p>
        </div>
        <Link
          href="/reportes"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-gray-950 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f14]"
        >
          Ver reportes{" "}
          <span className="ml-2" aria-hidden="true">
            ↗
          </span>
        </Link>
      </div>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200"
        >
          <p className="font-medium">
            Algunos datos del resumen no están disponibles.
          </p>
          <ul className="mt-1 space-y-1 text-amber-200/80">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index="01"
          label="Productos en catálogo"
          value={products ? products.total.toLocaleString("es-CL") : "—"}
          detail="Productos registrados en inventario"
        />
        <MetricCard
          index="02"
          label="Ingresos pagados"
          value={sales ? formatCLP(sales.totals.paid) : "—"}
          detail="Acumulado de ventas con estado pagado"
        />
        <MetricCard
          index="03"
          label="Pedidos por resolver"
          value={sales ? formatCLP(sales.totals.pending) : "—"}
          detail="Monto solicitado o confirmado"
        />
        <MetricCard
          index="04"
          label="Ventas · últimos 7 días"
          value={sales ? weekSales.toLocaleString("es-CL") : "—"}
          detail={
            sales
              ? `${formatCLP(weekTotal)} en ventas registradas`
              : "Resumen semanal"
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border border-white/[0.07] bg-[#111821] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-100">
                Actividad de ventas
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ingresos por día · últimos siete días
              </p>
            </div>
            <span className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-gray-400">
              {sales ? formatCLP(weekTotal) : "Sin datos"}
            </span>
          </div>
          {sales ? (
            <div
              className="mt-8 grid h-48 grid-cols-7 items-end gap-2 sm:gap-4"
              role="img"
              aria-label={`Ventas diarias de los últimos siete días. Total: ${formatCLP(weekTotal)}.`}
            >
              {sales.recent.map((day) => {
                const barHeight = Math.max(
                  5,
                  (day.total / maxDailyTotal) * 100,
                );
                const weekday = new Date(
                  `${day.date}T12:00:00`,
                ).toLocaleDateString("es-CL", { weekday: "short" });
                return (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                    title={`${day.date}: ${formatCLP(day.total)} · ${day.sales} ventas`}
                  >
                    <div className="flex h-full w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-cyan-400/80 transition-[height] duration-300"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] capitalize text-gray-500 sm:text-xs">
                      {weekday.replace(".", "")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 flex h-48 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-sm text-gray-500">
              No se pudo cargar la actividad de ventas.
            </div>
          )}
        </Card>

        <Card className="border border-white/[0.07] bg-[#111821] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-100">
                Accesos rápidos
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tareas frecuentes del equipo
              </p>
            </div>
            <span className="font-mono text-[10px] tracking-widest text-gray-600">
              GO
            </span>
          </div>
          <div className="mt-5 divide-y divide-white/[0.06]">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex min-h-[4.25rem] items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0"
              >
                <span className="font-mono text-[10px] text-gray-600 group-hover:text-cyan-300">
                  {action.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-200">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                    {action.detail}
                  </span>
                </span>
                <span
                  className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
