import { z } from 'zod';
import { id } from '@neojapan/schemas';

export const signUploadSchema = z.object({
  productId: id,
});

export const confirmUploadSchema = z.object({
  productId: id,
  publicId: z.string().trim().min(1).max(300),
  alt: z.string().trim().max(200).optional(),
  isPrimary: z.boolean().default(false),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
