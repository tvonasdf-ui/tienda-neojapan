import { z } from 'zod';

export const cloudinaryImageResourceSchema = z.object({
  public_id: z.string(),
  resource_type: z.string(),
  format: z.string(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).transform((resource) => ({
  publicId: resource.public_id,
  resourceType: resource.resource_type,
  format: resource.format,
  bytes: resource.bytes,
  width: resource.width,
  height: resource.height,
}));
