import { defineConfig } from 'vitest/config'

// Unit tests live next to the code they test, under src/. The examples/ tree
// carries vendored repos with their own suites; they are not ours to run.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'examples/**'],
    environment: 'happy-dom',
  },
})
