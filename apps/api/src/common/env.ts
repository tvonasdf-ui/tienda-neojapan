import { z } from 'zod';

const booleanFromEnv = z
  .preprocess((value) => {
    if (value === undefined || value === '') return false;
    return value === 'true' || value === true || value === '1' || value === 1;
  }, z.boolean())
  .default(false);

/**
 * Variable de entorno validadas al arrancar. Los valores por defecto
 * corresponden al desarrollo local (docker-compose de la app).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  DATA_STORE: z.enum(['memory', 'database']).default('memory'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001'),
  SUPABASE_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional(),
  ),
  CLOUDINARY_CLOUD_NAME: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  CLOUDINARY_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  CLOUDINARY_API_SECRET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  CLOUDINARY_UPLOAD_PRESET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  STORE_NAME: z.string().trim().min(1).default('Neojapan'),
  STORE_WHATSAPP_NUMBER: z.string().regex(/^\d{8,15}$/, 'STORE_WHATSAPP_NUMBER debe incluir el código de país y solo dígitos').optional(),
  STORE_BASE_URL: z.string().url().default('http://localhost:3000'),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().max(1440).default(30),
  DISPATCH_BASE_PRICE: z.coerce.number().int().nonnegative().default(0),
  STORE_COUPON_CODE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).max(40).optional(),
  ),
  STORE_COUPON_PERCENT: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).max(100).optional(),
  ),
  WEB_REVALIDATE_URL: z.string().url().optional(),
  WEB_REVALIDATE_SECRET: z.string().min(32).optional(),
  AUTH_DEMO_BYPASS: booleanFromEnv,
  DEMO_STAFF_ID: z
    .preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.string().uuid(),
    )
    .default('10000000-0000-4000-8000-000000000001'),
  DEMO_STAFF_EMAIL: z
    .preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.string().trim().email(),
    )
    .default('demo@neojapan.cl'),
  DEMO_STAFF_ROLE: z.enum(['ADMIN', 'STAFF']).default('ADMIN'),
}).superRefine((env, context) => {
  const cloudinaryValues = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
    env.CLOUDINARY_UPLOAD_PRESET,
  ];
  const configuredValues = cloudinaryValues.filter(Boolean).length;
  if (configuredValues > 0 && configuredValues < cloudinaryValues.length) {
    context.addIssue({
      code: 'custom',
      message: 'Cloudinary requiere configurar CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET y CLOUDINARY_UPLOAD_PRESET en conjunto',
      path: ['CLOUDINARY_CLOUD_NAME'],
    });
  }
  if (Boolean(env.STORE_COUPON_CODE) !== (env.STORE_COUPON_PERCENT !== undefined)) {
    context.addIssue({
      code: 'custom',
      message: 'STORE_COUPON_CODE y STORE_COUPON_PERCENT deben configurarse juntos',
      path: ['STORE_COUPON_CODE'],
    });
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}