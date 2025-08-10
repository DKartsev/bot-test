import * as z from 'zod';
export const CreateUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1)
  })
});
