import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    preserveSymlinks: true
  },
  test: {
    environment: 'node',
    pool: 'threads',
    testTimeout: 10_000,
    include: ['tests/**/*.test.ts']
  }
});
