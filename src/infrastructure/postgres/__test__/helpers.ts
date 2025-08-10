import { it } from 'vitest';
import { bypassRlsPrisma, truncate } from './bypass-rls-prisma';
import { testEnv } from './test-env';

/**
 * Helper function to repeat a test multiple times with cleanup between runs.
 * Each test run is followed by a truncate operation (except the last one).
 */
export const repeatTest = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    for (let i = 0; i < testEnv.TEST_REPEAT_COUNT; i++) {
      await fn();
    }
  });
};

export const deleteAll =
  testEnv.METHOD_A_DELETION_STRATEGY === 'deleteMany'
    ? bypassRlsPrisma.tenant.deleteMany
    : truncate;

export const repeatTestWithDelete = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    for (let i = 0; i < testEnv.TEST_REPEAT_COUNT; i++) {
      await fn();
      if (i < testEnv.TEST_REPEAT_COUNT - 1) {
        await deleteAll();
      }
    }
  });
};
