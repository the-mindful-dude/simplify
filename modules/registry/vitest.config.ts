import { defineConfig } from 'vitest/config';

// Hook tests exercise React Query with a real QueryClient, so they need a DOM.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    reporters: ['default'],
  },
});
