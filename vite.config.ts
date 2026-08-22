import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// `base: './'` keeps every emitted asset reference relative, which is what a later
// Electron wrap needs (ARCHITECTURE §6) — including FantasyUI's generated art
// variables, whose `/fui/...` URLs are rewritten to `../fui/...` at build time.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    restoreMocks: true,
  },
});
