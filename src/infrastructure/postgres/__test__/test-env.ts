import * as z from 'zod';

const zTestEnv = z.object({
  ADMIN_TEST_DATABASE_URL: z.string(),
  TEST_REPEAT_COUNT: z.coerce.number().int().min(1).default(1),
  METHOD_A_DELETION_STRATEGY: z.enum(['truncate', 'deleteMany']).default('deleteMany'),
  METHOD_C_DB_INIT_STRATEGY: z
    .enum(['applyMigrationsEveryTest', 'snapshot'])
    .default('applyMigrationsEveryTest'),
});

export const testEnv = zTestEnv.parse(process.env);
