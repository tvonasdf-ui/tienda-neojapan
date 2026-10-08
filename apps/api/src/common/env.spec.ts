import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const baseConfig = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/neojapan',
  DATA_STORE: 'memory',
};

describe('validateEnv storefront coupon settings', () => {
  it('allows the storefront to run without a promotional code', () => {
    expect(validateEnv(baseConfig).STORE_COUPON_CODE).toBeUndefined();
  });

  it('requires the promotional code and percentage as a pair', () => {
    expect(() => validateEnv({ ...baseConfig, STORE_COUPON_CODE: 'BIENVENIDA' })).toThrow();
    expect(() => validateEnv({ ...baseConfig, STORE_COUPON_PERCENT: '10' })).toThrow();
  });

  it('accepts a paired code and percentage within the supported range', () => {
    expect(
      validateEnv({
        ...baseConfig,
        STORE_COUPON_CODE: ' BIENVENIDA ',
        STORE_COUPON_PERCENT: '10',
      }),
    ).toMatchObject({
      STORE_COUPON_CODE: 'BIENVENIDA',
      STORE_COUPON_PERCENT: 10,
    });
  });

  it('rejects percentage values outside 1–100', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        STORE_COUPON_CODE: 'BIENVENIDA',
        STORE_COUPON_PERCENT: '101',
      }),
    ).toThrow();
  });
});
