import * as z from 'zod';

const zTestEnv = z.object({
  ADMIN_TEST_DATABASE_URL: z.string(),
  TEST_REPEAT_COUNT: z.coerce.number().int().min(1).default(1),
  METHOD_A_DELETION_STRATEGY: z.enum(['truncate', 'deleteMany']).default('deleteMany'),
});

export const testEnv = zTestEnv.parse(process.env);
