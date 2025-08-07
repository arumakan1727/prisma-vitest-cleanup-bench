import * as z from 'zod';

const zEnv = z.object({
  APP_DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = zEnv.parse(process.env);
