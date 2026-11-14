import { z } from 'zod';

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};

const commaSeparated = (maxItems) => z.string().trim().transform((value) => (
  [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
)).refine((items) => items.length > 0 && items.length <= maxItems, {
  message: `Provide between 1 and ${maxItems} comma-separated values.`,
});

export const discoveryQuerySchema = z.object({
  ...pagination,
  status: commaSeparated(2)
    .refine((statuses) => statuses.every((status) => ['LIVE', 'SCHEDULED'].includes(status)), {
      message: 'Status must contain only LIVE or SCHEDULED.',
    })
    .default(['LIVE', 'SCHEDULED']),
  categoryId: z.string().uuid().optional(),
  tags: commaSeparated(10).optional(),
  search: z.string().trim().min(1).max(100).optional(),
}).strict();

export const tagQuerySchema = z.object({
  search: z.string().trim().min(1).max(50).optional(),
}).strict();

export const usernameSchema = z.object({
  username: z.string().trim().min(3).max(50),
});

export const creatorIdSchema = z.object({ creatorId: z.string().uuid() });

export const historyQuerySchema = z.object(pagination).strict();

export const recordHistorySchema = z.object({
  streamId: z.string().uuid(),
  watchDuration: z.number().int().min(0).max(86400),
}).strict();
