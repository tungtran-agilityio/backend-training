import { z } from 'zod';

export const createUserBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateUserBaseDto = z.infer<typeof createUserBaseSchema>;
