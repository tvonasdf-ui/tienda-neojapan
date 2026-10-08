import type { Condition } from '@neojapan/schemas';

export interface ConditionPolicyEntry {
  code: Condition;
  /** Título corto que se muestra en chips/filtros. */
  label: string;
  /** Descripción para la ficha del producto. */
  description: string;
}

/**
 * Política de condición (plan §7: "política de condición A/B/C").
 *
 * Texts provisionales definidos en Fase 0; la redacción final se curará en la
 * fase de "catálogo inicial". Regla de oro: todo usado SIEMPRE con fotos
 * propias de la unidad (plan §3.1) — el grado nunca sustituye a la foto.
 */
export const CONDITION_POLICY: ReadonlyArray<ConditionPolicyEntry> = [
  {
    code: 'NEW',
    label: 'Nuevo',
    description: 'Sellado o sin uso previo.',
  },
  {
    code: 'A',
    label: 'Como nuevo',
    description: 'Usado impecable, sin rayones visibles, 100% funcional.',
  },
  {
    code: 'B',
    label: 'Buen estado',
    description: 'Uso visible (rayones/desgaste leve), 100% funcional.',
  },
  {
    code: 'C',
    label: 'Para restaurar',
    description: 'Funciona con daño estético o reparación pendiente.',
  },
];

export function conditionPolicyFor(code: Condition): ConditionPolicyEntry {
  const entry = CONDITION_POLICY.find((e) => e.code === code);
  if (!entry) {
    throw new Error(`Política de condición no definida para ${code}`);
  }
  return entry;
}