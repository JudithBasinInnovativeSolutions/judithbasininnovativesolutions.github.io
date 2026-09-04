import { defineConfig } from 'vitest/config';
import vinext from 'vinext';

export default defineConfig({
  plugins: [vinext()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    passWithNoTests: false,
  },
});
