import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Injects describe/it/expect/beforeAll as globals so the CommonJS test
    // files never need to `require('vitest')`, which Vitest 4 disallows.
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Each file gets its own in-memory MongoDB, so suites cannot interfere
    // with one another's data.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ['tests/**/*.test.js'],
  },
});
