import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
    },
    env: {
      APP_DATABASE_URL: process.env['APP_TEST_DATABASE_URL'],
    },
    silent: 'passed-only',
    projects: [
      {
        extends: true,
        test: {
          name: 'A',
          include: ['src/infrastructure/postgres/__test__/A_each-commit-truncate/**/*.test.ts'],
          setupFiles:
            './src/infrastructure/postgres/__test__/A_each-commit-truncate/+each-file-setup.ts',
          globalSetup:
            './src/infrastructure/postgres/__test__/A_each-commit-truncate/+global-setup.ts',
        },
      },
    ],
  },
});
