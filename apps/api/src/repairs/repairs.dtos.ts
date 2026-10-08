import { repairTicketSchema, RepairStatus } from '@neojapan/schemas';
import { z } from 'zod';
import type { RepairAdvanceInput } from './repairs-rules';

export const repairIdParamsSchema = z.object({
  repairId: z.string().uuid(),
});
export type RepairIdParams = z.infer<typeof repairIdParamsSchema>;

export const createRepairTicketBodySchema = repairTicketSchema.omit({
  id: true,
  code: true,
  status: true,
  createdByUserId: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateRepairTicketBody = z.infer<typeof createRepairTicketBodySchema>;

export const advanceRepairTicketBodySchema = z.object({
  status: RepairStatus,
  diagnosis: z.string().trim().max(2000).optional(),
  quoteAmount: z.coerce.number().int().nonnegative().optional(),
  repairNotes: z.string().trim().max(2000).optional(),
  cancellationReason: z.string().trim().max(2000).optional(),
});
export type AdvanceRepairTicketBody = RepairAdvanceInput & {
  status: RepairStatus;
};

export const repairTicketListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: RepairStatus.optional(),
});
export type RepairTicketListQuery = z.infer<typeof repairTicketListQuerySchema>;