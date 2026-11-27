import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Every package invokes this shared config with its own cwd. Detect the UI
// package so component tests get a DOM, while framework-independent packages
// keep the faster node environment. The glob also covers root-level runs that
// target UI test files explicitly.
const cwd = process.cwd();
const cwdSegments = cwd.split(path.sep);
const isUiPackage = cwdSegments.at(-1) === 'ui' && cwdSegments.at(-2) === 'packages';

export default defineConfig({
  test: {
    root: cwd,
    environment: isUiPackage ? 'jsdom' : 'node',
    environmentMatchGlobs: [['**/packages/ui/**/*.test.{ts,tsx}', 'jsdom']],
    include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    setupFiles: isUiPackage ? ['@testing-library/jest-dom/vitest'] : [],
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
