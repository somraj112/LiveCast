import { z } from 'zod';

const email = z.string().trim().email().max(255).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may contain only letters, numbers, and underscores.'),
  email,
  password,
}).strict();

export const loginSchema = z.object({ email, password }).strict();
