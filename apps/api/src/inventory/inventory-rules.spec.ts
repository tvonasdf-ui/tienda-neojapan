import { describe, expect, it } from 'vitest';
import {
  applyEffectToLevel,
  assertDeltaSign,
  capacityIsSatisfied,
  effectOf,
} from './inventory-rules';

describe('inventory-rules', () => {
  describe('effectOf', () => {
    it('RECEIPT/RETURN/ADJUSTMENT/LOSS mueven onHand', () => {
      expect(effectOf('RECEIPT')).toEqual({ onHand: 'delta', reserved: 'none' });
      expect(effectOf('RETURN')).toEqual({ onHand: 'delta', reserved: 'none' });
      expect(effectOf('ADJUSTMENT')).toEqual({ onHand: 'delta', reserved: 'none' });
      expect(effectOf('LOSS')).toEqual({ onHand: 'delta', reserved: 'none' });
    });

    it('RESERVATION/RELEASE mueven reserved', () => {
      expect(effectOf('RESERVATION')).toEqual({ onHand: 'none', reserved: 'delta' });
      expect(effectOf('RELEASE')).toEqual({ onHand: 'none', reserved: 'delta' });
    });

    it('SALE mueve onHand y reserved (confirma la reserva)', () => {
      expect(effectOf('SALE')).toEqual({ onHand: 'delta', reserved: 'delta' });
    });
  });

  describe('assertDeltaSign', () => {
    it('exige delta positivo para RECEIPT/RETURN/RESERVATION', () => {
      for (const type of ['RECEIPT', 'RETURN', 'RESERVATION'] as const) {
        expect(() => assertDeltaSign(type, 0)).toThrow();
        expect(() => assertDeltaSign(type, -1)).toThrow();
        expect(() => assertDeltaSign(type, 3)).not.toThrow();
      }
    });

    it('exige delta negativo para SALE/RELEASE/LOSS', () => {
      for (const type of ['SALE', 'RELEASE', 'LOSS'] as const) {
        expect(() => assertDeltaSign(type, 0)).toThrow();
        expect(() => assertDeltaSign(type, 1)).toThrow();
        expect(() => assertDeltaSign(type, -3)).not.toThrow();
      }
    });

    it('ADJUSTMENT admite ambos signos pero no cero', () => {
      expect(() => assertDeltaSign('ADJUSTMENT', 0)).toThrow();
      expect(() => assertDeltaSign('ADJUSTMENT', 4)).not.toThrow();
      expect(() => assertDeltaSign('ADJUSTMENT', -4)).not.toThrow();
    });
  });

  describe('capacityIsSatisfied', () => {
    it('reserva requiere onHand - reserved >= delta', () => {
      expect(capacityIsSatisfied({ onHand: 5, reserved: 2 }, 'RESERVATION', 3)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 5, reserved: 2 }, 'RESERVATION', 4)).toBe(false);
    });

    it('release requiere reservas suficientes', () => {
      expect(capacityIsSatisfied({ onHand: 5, reserved: 2 }, 'RELEASE', -2)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 5, reserved: 2 }, 'RELEASE', -3)).toBe(false);
    });

    it('loss exige stock físico disponible', () => {
      expect(capacityIsSatisfied({ onHand: 5, reserved: 0 }, 'LOSS', -5)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 4, reserved: 0 }, 'LOSS', -5)).toBe(false);
    });

    it('sale exige reserva y físico', () => {
      expect(capacityIsSatisfied({ onHand: 5, reserved: 2 }, 'SALE', -2)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 3, reserved: 2 }, 'SALE', -4)).toBe(false);
      expect(capacityIsSatisfied({ onHand: 5, reserved: 1 }, 'SALE', -2)).toBe(false);
    });

    it('ajuste negativo respeta onHand; positivo y entradas no limitan', () => {
      expect(capacityIsSatisfied({ onHand: 2, reserved: 0 }, 'ADJUSTMENT', -2)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 1, reserved: 0 }, 'ADJUSTMENT', -2)).toBe(false);
      expect(capacityIsSatisfied({ onHand: 0, reserved: 0 }, 'ADJUSTMENT', 10)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 0, reserved: 0 }, 'RECEIPT', 10)).toBe(true);
      expect(capacityIsSatisfied({ onHand: 0, reserved: 0 }, 'RETURN', 10)).toBe(true);
    });
  });

  describe('applyEffectToLevel', () => {
    it('aplica el delta solo a los campos afectados por el tipo', () => {
      expect(applyEffectToLevel({ onHand: 0, reserved: 0 }, 'RECEIPT', 5)).toEqual({
        onHand: 5,
        reserved: 0,
      });
      expect(applyEffectToLevel({ onHand: 2, reserved: 0 }, 'RETURN', 1)).toEqual({
        onHand: 3,
        reserved: 0,
      });
      expect(applyEffectToLevel({ onHand: 8, reserved: 0 }, 'ADJUSTMENT', -3)).toEqual({
        onHand: 5,
        reserved: 0,
      });
      expect(applyEffectToLevel({ onHand: 8, reserved: 0 }, 'LOSS', -2)).toEqual({
        onHand: 6,
        reserved: 0,
      });
      expect(applyEffectToLevel({ onHand: 0, reserved: 0 }, 'RESERVATION', 5)).toEqual({
        onHand: 0,
        reserved: 5,
      });
      expect(applyEffectToLevel({ onHand: 5, reserved: 2 }, 'RELEASE', -2)).toEqual({
        onHand: 5,
        reserved: 0,
      });
      expect(applyEffectToLevel({ onHand: 10, reserved: 3 }, 'SALE', -3)).toEqual({
        onHand: 7,
        reserved: 0,
      });
    });
  });
});