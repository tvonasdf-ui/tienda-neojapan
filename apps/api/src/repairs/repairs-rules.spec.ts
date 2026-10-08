import { describe, expect, it } from 'vitest';
import {
  canTransition,
  repairAdvanceError,
  type RepairAdvanceInput,
} from './repairs-rules';

describe('repairs-rules', () => {
  it('recorre el ciclo completo RECEIVED → DELIVERED', () => {
    const flow = [
      'RECEIVED',
      'DIAGNOSED',
      'QUOTED',
      'APPROVED',
      'IN_REPAIR',
      'READY',
      'DELIVERED',
    ] as const;
    for (let index = 0; index < flow.length - 1; index += 1) {
      expect(canTransition(flow[index], flow[index + 1])).toBe(true);
    }
  });

  it('no permite saltos ni regresiones', () => {
    expect(canTransition('RECEIVED', 'IN_REPAIR')).toBe(false);
    expect(canTransition('READY', 'RECEIVED')).toBe(false);
    expect(canTransition('DELIVERED', 'READY')).toBe(false);
  });

  it('exige diagnóstico para DIAGNOSED y cotización para QUOTED', () => {
    expect(
      repairAdvanceError('RECEIVED', 'DIAGNOSED', {}),
    ).toContain('diagnóstico');
    expect(
      repairAdvanceError('DIAGNOSED', 'QUOTED', {}),
    ).toContain('cotización');
    expect(
      repairAdvanceError('DIAGNOSED', 'QUOTED', { quoteAmount: 25000 }),
    ).toBeNull();
  });

  it('exige motivo para CANCELLED y UNCLAIMED', () => {
    expect(
      repairAdvanceError('RECEIVED', 'CANCELLED', {}),
    ).toContain('motivo');
    expect(
      repairAdvanceError('READY', 'UNCLAIMED', { cancellationReason: 'Sin contacto' }),
    ).toBeNull();
  });

  it('acepta el avance con datos opcionales para pasos intermedios', () => {
    const input: RepairAdvanceInput = { repairNotes: 'Reemplazar palanca' };
    expect(repairAdvanceError('APPROVED', 'IN_REPAIR', input)).toBeNull();
  });
});