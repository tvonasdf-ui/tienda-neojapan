import type { RepairStatus } from '@neojapan/schemas';

/**
 * Reglas puras del servicio técnico (plan §4.8). El ticket se mueve por
 * transiciones explícitas; el equipo en custodia jamás toca `stock_levels`.
 */

export interface RepairAdvanceInput {
  diagnosis?: string;
  quoteAmount?: number;
  repairNotes?: string;
  cancellationReason?: string;
}

const TRANSITIONS: Record<RepairStatus, readonly RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED'],
  DIAGNOSED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_REPAIR', 'CANCELLED'],
  IN_REPAIR: ['READY'],
  READY: ['DELIVERED', 'UNCLAIMED'],
  DELIVERED: [],
  CANCELLED: [],
  UNCLAIMED: [],
};

export function canTransition(
  from: RepairStatus,
  to: RepairStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Devuelve un mensaje si la transición no está permitida o falta un dato. */
export function repairAdvanceError(
  from: RepairStatus,
  to: RepairStatus,
  input: RepairAdvanceInput,
): string | null {
  if (!canTransition(from, to)) {
    return `Transición de ${from} a ${to} no permitida`;
  }
  if (to === 'DIAGNOSED' && !input.diagnosis?.trim()) {
    return 'El diagnóstico es obligatorio para pasar a DIAGNOSED';
  }
  if (to === 'QUOTED' && (input.quoteAmount === undefined || input.quoteAmount < 0)) {
    return 'La cotización es obligatoria para pasar a QUOTED';
  }
  if (
    (to === 'CANCELLED' || to === 'UNCLAIMED') &&
    !input.cancellationReason?.trim()
  ) {
    return 'El motivo es obligatorio para cancelar o declarar el equipo no retirado';
  }
  return null;
}