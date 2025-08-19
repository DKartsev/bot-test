import { z } from 'zod';

export const GetChatParamsSchema = z.object({
  chat_id: z.string().uuid(),
});
