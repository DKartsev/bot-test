import { z } from 'zod';
export const QAEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  lang: z.string().optional(),
  vars: z.array(z.string()).optional(),
  status: z.enum(['approved','pending']).optional()
});
export type QAEntry = z.infer<typeof QAEntrySchema>;
