import { z } from 'zod';
import { id } from '@neojapan/schemas';

export const garageSaveSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(6).max(32),
  consoleModelId: id,
  notes: z.string().trim().max(500).optional(),
});

export const garagePhoneQuerySchema = z.object({
  phone: z.string().trim().min(6).max(32),
});

export type GarageSaveInput = z.infer<typeof garageSaveSchema>;
