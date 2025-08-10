import { z } from 'zod';
export const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20)
});
export type ListResult<T> = { items: T[]; nextCursor?: string };
