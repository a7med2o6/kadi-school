import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
