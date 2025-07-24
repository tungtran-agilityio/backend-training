import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  PASSWORD_PEPPER: z.string(),
  HASH_MEMORY_COST: z.coerce
    .number()
    .int()
    .positive()
    .default(2 ** 16),
  HASH_TIME_COST: z.coerce.number().int().positive().default(2),
  HASH_PARALLELISM: z.coerce.number().int().positive().default(1),
  JWT_SECRET: z.string(),
  FRONTEND_URL: z.string().optional(),
});

export default envSchema;

export type Env = z.infer<typeof envSchema>;
