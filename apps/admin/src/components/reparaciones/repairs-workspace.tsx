"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Input } from "@neojapan/ui";
import {
  ACTIVE_REPAIR_STATUSES,
  REPAIR_STATUS_LABELS,
  REPAIR_TRANSITIONS,
  clientApi,
  formatCLP,
  formatDate,
  type RepairStatus,
  type RepairTicket,
} from "@/lib/api";

const STATUS_TONES: Record<RepairStatus, "accent" | "neutral" | "success" | "warning" | "danger"> = {
  RECEIVED: "warning",
  DIAGNOSED: "neutral",
  QUOTED: "accent",
  APPROVED: "success",
  IN_REPAIR: "warning",
  READY: "success",
  DELIVERED: "neutral",
  CANCELLED: "danger",
  UNCLAIMED: "danger",
};

const EMPTY_FORM = {
  customerName: "",
  customerPhone: "",
  deviceName: "",
  deviceModel: "",
  deviceSerialNumber: "",
  faultDescription: "",
};

interface NewTicketFormProps {
  onCreated: () => void;
}

function NewTicketForm({ onCreated }: NewTicketFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await clientApi<RepairTicket>("/repairs", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          deviceName: form.deviceName.trim(),
          deviceModel: form.deviceModel.trim() || undefined,
          deviceSerialNumber: form.deviceSerialNumber.trim() || undefined,
          faultDescription: form.faultDescription.trim(),
        }),
      });
      setForm(EMPTY_FORM);
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-2xl border border-white/[0.07] bg-[#111821] p-5 sm:grid-cols-2"
    >
      <Input
        label="Nombre del cliente *"
        value={form.customerName}
        onChange={(event) => update("customerName", event.target.value)}
        required
      />
      <Input
        label="Teléfono *"
        type="tel"
        value={form.customerPhone}
        onChange={(event) => update("customerPhone", event.target.value)}
        required
      />
      <Input
        label="Equipo *"
        value={form.deviceName}
        onChange={(event) => update("deviceName", event.target.value)}
        required
      />
      <Input
        label="Modelo"
        value={form.deviceModel}
        onChange={(event) => update("deviceModel", event.target.value)}
      />
      <Input
        label="Número de serie"
        value={form.deviceSerialNumber}
        onChange={(event) => update("deviceSerialNumber", event.target.value)}
      />
      <label className="flex flex-col gap-1.5 text-sm text-gray-300 sm:col-span-2">
        Descripción de la falla *
        <textarea
          required
          rows={3}
          value={form.faultDescription}
          onChange={(event) => update("faultDescription", event.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 focus:outline-none"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-400 sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" loading={submitting}>
          Crear ticket
        </Button>
        <span className="text-xs text-gray-500">
          El ticket queda <strong>Recibido</strong> pendiente de diagnóstico.
        </span>
      </div>
    </form>
  );
}

interface AdvanceRowProps {
  ticket: RepairTicket;
  onAdvanced: () => void;
  onClose: () => void;
}

function AdvanceRow({ ticket, onAdvanced, onClose }: AdvanceRowProps) {
  const [status, setStatus] = useState<RepairStatus>(
    REPAIR_TRANSITIONS[ticket.status][0] ?? ticket.status,
  );
  const [diagnosis, setDiagnosis] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload: Record<string, unknown> = { status };
    if (status === "DIAGNOSED") payload.diagnosis = diagnosis.trim();
    if (status === "QUOTED") payload.quoteAmount = Number(quoteAmount);
    if (status === "CANCELLED" || status === "UNCLAIMED") {
      payload.cancellationReason = cancellationReason.trim();
    }
    if (repairNotes.trim()) payload.repairNotes = repairNotes.trim();
    try {
      await clientApi(`/repairs/${ticket.id}/advance`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAdvanced();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo registrar el avance.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-gray-300">
          Siguiente estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as RepairStatus)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
          >
            {REPAIR_TRANSITIONS[ticket.status].map((next) => (
              <option key={next} value={next}>
                {REPAIR_STATUS_LABELS[next]}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>

      {status === "DIAGNOSED" ? (
        <label className="flex flex-col gap-1.5 text-sm text-gray-300">
          Diagnóstico *
          <textarea
            required
            rows={3}
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
          />
        </label>
      ) : null}

      {status === "QUOTED" ? (
        <label className="flex flex-col gap-1.5 text-sm text-gray-300">
          Monto de la cotización (CLP) *
          <input
            required
            type="number"
            min={0}
            step={1}
            value={quoteAmount}
            onChange={(event) => setQuoteAmount(event.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
          />
        </label>
      ) : null}

      {status === "CANCELLED" || status === "UNCLAIMED" ? (
        <label className="flex flex-col gap-1.5 text-sm text-gray-300">
          Motivo *
          <textarea
            required
            rows={2}
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm text-gray-300">
        Notas de reparación (opcional)
        <textarea
          rows={2}
          value={repairNotes}
          onChange={(event) => setRepairNotes(event.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={submitting}>
        Registrar avance
      </Button>
    </form>
  );
}

export function RepairsWorkspace() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [filter, setFilter] = useState<"ALL" | RepairStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const query = filter === "ALL" ? "?limit=200" : `?limit=200&status=${filter}`;
    let cancelled = false;
    clientApi<{ items: RepairTicket[] }>(`/repairs${query}`)
      .then((payload) => {
        if (!cancelled) {
          setTickets(payload.items);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los tickets.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, refreshKey]);

  const activeCount = tickets.filter((ticket) =>
    ACTIVE_REPAIR_STATUSES.includes(ticket.status),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gray-100">
            Servicio técnico
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Recepción, diagnóstico, cotización y entrega de equipos en custodia.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            Estado
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as "ALL" | RepairStatus);
                setLoading(true);
              }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">Todos</option>
              {ACTIVE_REPAIR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {REPAIR_STATUS_LABELS[status]}
                </option>
              ))}
              <option value="CANCELLED">Cancelados</option>
              <option value="UNCLAIMED">No retirados</option>
            </select>
          </label>
          <Button onClick={() => setCreating((open) => !open)}>
            {creating ? "Cerrar" : "Nuevo ticket"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="text-gray-400">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-cyan-300">{activeCount} en curso</span>
      </div>

      {creating ? (
        <NewTicketForm
          onCreated={() => {
            setLoading(true);
            setRefreshKey((key) => key + 1);
          }}
        />
      ) : null}

      {loading ? (
        <Card className="p-6">Cargando tickets…</Card>
      ) : error && tickets.length === 0 ? (
        <Card className="p-6 text-red-400">{error}</Card>
      ) : (
        <Card className="overflow-x-auto border border-white/[0.07] bg-[#111821] p-0">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cotización</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <RepairRow
                  key={ticket.id}
                  ticket={ticket}
                  advancing={advancingId === ticket.id}
                  onAdvanceClick={() =>
                    setAdvancingId((current) =>
                      current === ticket.id ? null : ticket.id,
                    )
                  }
                  onAdvanced={() => {
                    setAdvancingId(null);
                    setLoading(true);
                    setRefreshKey((key) => key + 1);
                  }}
                />
              ))}
            </tbody>
          </table>
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay tickets de reparación.
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

function RepairRow({
  ticket,
  advancing,
  onAdvanceClick,
  onAdvanced,
}: {
  ticket: RepairTicket;
  advancing: boolean;
  onAdvanceClick: () => void;
  onAdvanced: () => void;
}) {
  const canAdvance = REPAIR_TRANSITIONS[ticket.status].length > 0;
  return (
    <>
      <tr className="border-b border-gray-800 last:border-0">
        <td className="px-4 py-3">
          <strong className="font-mono">{ticket.code}</strong>
          <div className="text-xs text-gray-500">
            {formatDate(ticket.createdAt)}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-300">
          {ticket.customerName}
          <div className="text-xs text-gray-500">{ticket.customerPhone}</div>
        </td>
        <td className="px-4 py-3 text-gray-300">
          {ticket.deviceName}
          <div className="text-xs text-gray-500">
            {[ticket.deviceModel, ticket.deviceSerialNumber]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge tone={STATUS_TONES[ticket.status]}>
            {REPAIR_STATUS_LABELS[ticket.status]}
          </Badge>
          {ticket.diagnosis ? (
            <div className="mt-1 max-w-[16rem] truncate text-xs text-gray-500">
              {ticket.diagnosis}
            </div>
          ) : null}
        </td>
        <td className="px-4 py-3 font-mono">
          {ticket.quoteAmount !== null ? formatCLP(ticket.quoteAmount) : "—"}
        </td>
        <td className="px-4 py-3">
          {canAdvance ? (
            <button
              type="button"
              onClick={onAdvanceClick}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-100 transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {advancing ? "Cerrar" : "Avanzar"}
            </button>
          ) : (
            <span className="text-xs text-gray-600">Cerrado</span>
          )}
        </td>
      </tr>
      {advancing ? (
        <tr className="border-b border-gray-800 bg-[#0d131a] last:border-0">
          <td colSpan={6} className="px-4 py-4">
            <AdvanceRow
              ticket={ticket}
              onAdvanced={onAdvanced}
              onClose={onAdvanceClick}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}