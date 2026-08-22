import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Use a Chromium that is already on the machine when there is one, instead of
 * downloading a second copy. CI (and a fresh clone) fall back to Playwright's
 * own managed browser.
 */
const PREINSTALLED_CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(PREINSTALLED_CHROMIUM)
  ? { executablePath: PREINSTALLED_CHROMIUM }
  : {};

/**
 * Smoke tests run against the *built* site rather than the dev server, so what is
 * verified is what actually ships — including the asset rewriting Vite does at
 * build time. Viewport is the brief's primary desktop target (§20.6).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1920, height: 1080 },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } }],
  webServer: {
    // `vite preview` serves whatever is in dist/, so the build belongs here: a
    // smoke run must never quietly test the previous build.
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
