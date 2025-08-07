import * as z from 'zod';

const zTestEnv = z.object({
  ADMIN_TEST_DATABASE_URL: z.string(),
});

export const testEnv = zTestEnv.parse(process.env);
