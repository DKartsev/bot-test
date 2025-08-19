import * as z from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

export const CreateUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1),
  }),
});

export const UserListResponse = z.object({
  items: z.array(UserSchema),
  nextCursor: z.string().optional(),
});
