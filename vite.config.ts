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
    /**
     * No source map in the deployed build. The map is a full copy of the
     * TypeScript source of a commercial game (Brief §0.1), and `sourcemap: true`
     * both emits it and points at it from the bundle — one click in DevTools and
     * the game is open source by accident.
     *
     * Nothing needs it in production: there is no backend and no telemetry (§21),
     * so no error tracker is on the other end to consume one. When a player sends
     * a minified stack trace, rebuild that tagged commit locally with
     * `--sourcemap` and read it there — the build is deterministic, so the frames
     * line up (docs/DEPLOY.md §4).
     */
    sourcemap: false,
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
