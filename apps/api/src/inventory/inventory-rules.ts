import type { StockMovementType } from '@neojapan/schemas';

/**
 * Reglas puras del libro de movimientos (plan §4.3).
 *
 * El delta de cada movimiento es SIEMPRE con signo y su efecto y guardas se
 * derivan solo del tipo: aquí vive la única definición del negocio, y la
 * transacción (inventory.service) la aplica de forma atómica.
 */

export interface StockLevelNumbers {
  onHand: number;
  reserved: number;
}

export interface StockLevelEffect {
  onHand: 'delta' | 'none';
  reserved: 'delta' | 'none';
}

const EFFECT_BY_TYPE: Record<StockMovementType, StockLevelEffect> = {
  RECEIPT: { onHand: 'delta', reserved: 'none' },
  RETURN: { onHand: 'delta', reserved: 'none' },
  ADJUSTMENT: { onHand: 'delta', reserved: 'none' },
  LOSS: { onHand: 'delta', reserved: 'none' },
  RESERVATION: { onHand: 'none', reserved: 'delta' },
  RELEASE: { onHand: 'none', reserved: 'delta' },
  SALE: { onHand: 'delta', reserved: 'delta' },
};

const REQUIRES_POSITIVE: ReadonlySet<StockMovementType> = new Set([
  'RECEIPT',
  'RETURN',
  'RESERVATION',
]);

const REQUIRES_NEGATIVE: ReadonlySet<StockMovementType> = new Set([
  'SALE',
  'RELEASE',
  'LOSS',
]);

export function effectOf(type: StockMovementType): StockLevelEffect {
  return EFFECT_BY_TYPE[type];
}

/** Lanza un Error si el signo del delta no corresponde al tipo. */
export function assertDeltaSign(type: StockMovementType, delta: number): void {
  if (REQUIRES_POSITIVE.has(type) && delta <= 0) {
    throw new Error(`El movimiento ${type} requiere un delta positivo`);
  }
  if (REQUIRES_NEGATIVE.has(type) && delta >= 0) {
    throw new Error(`El movimiento ${type} requiere un delta negativo`);
  }
  if (type === 'ADJUSTMENT' && delta === 0) {
    throw new Error('El ajuste de stock requiere un delta distinto de 0');
  }
}

/**
 * Aplica el efecto del movimiento a un nivel sin validar capacidad.
 * La invariante la garantiza `capacityIsSatisfied` antes de persistir.
 */
export function applyEffectToLevel(
  level: StockLevelNumbers,
  type: StockMovementType,
  delta: number,
): StockLevelNumbers {
  const effect = effectOf(type);
  return {
    onHand: level.onHand + (effect.onHand === 'delta' ? delta : 0),
    reserved: level.reserved + (effect.reserved === 'delta' ? delta : 0),
  };
}

/**
 * Guardas de capacidad mínima antes de mutar el nivel. Son el gemelo JS de
 * los predicados SQL que aplica la transacción (la base es la que manda);
 * esta función sirve para decidir el error antes de persistir y para tests.
 */
export function capacityIsSatisfied(
  level: StockLevelNumbers,
  type: StockMovementType,
  delta: number,
): boolean {
  const qty = Math.abs(delta);
  switch (type) {
    case 'RESERVATION':
      return level.onHand - level.reserved >= delta;
    case 'RELEASE':
      return level.reserved >= qty;
    case 'LOSS':
      return level.onHand >= qty;
    case 'SALE':
      return level.reserved >= qty && level.onHand >= qty;
    case 'ADJUSTMENT':
      return delta >= 0 ? true : level.onHand >= qty;
    case 'RECEIPT':
    case 'RETURN':
    default:
      return true;
  }
}