import { it } from 'vitest';
import { truncate } from './+global-setup';
import { testEnv } from './test-env';

/**
 * Helper function to repeat a test multiple times with cleanup between runs.
 * Each test run is followed by a truncate operation (except the last one).
 */
export const repeatTest = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    for (let i = 0; i < testEnv.TEST_REPEAT_COUNT; i++) {
      await fn();
      if (i < testEnv.TEST_REPEAT_COUNT - 1) {
        await truncate();
      }
    }
  });
};
