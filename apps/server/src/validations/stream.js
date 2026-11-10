import { z } from 'zod';

const title = z.string().trim().min(3).max(150);
const description = z.string().trim().max(5000).nullable().optional();
const categoryId = z.string().uuid();
const visibility = z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']);

export const streamIdSchema = z.object({ streamId: z.string().uuid() });

export const createStreamSchema = z.object({
  title,
  description,
  categoryId,
  visibility: visibility.optional(),
}).strict();

export const updateStreamSchema = z.object({
  title: title.optional(),
  description,
  categoryId: categoryId.optional(),
  visibility: visibility.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one stream field must be provided.',
});

export const scheduleStreamSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
}).strict();
