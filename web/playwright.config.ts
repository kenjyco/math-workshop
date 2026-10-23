import { defineConfig } from '@playwright/test';
import { testOutput, externalPath } from '../scripts/external-output.mjs';
// Validate screenshot paths before starting any test-owned process.
if (process.env.SCREENSHOT_DIR !== undefined) externalPath(process.env.SCREENSHOT_DIR);
export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 6000 },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1366, height: 900 },
    reducedMotion: 'reduce',
  },
  reporter: [['list']],
  outputDir: testOutput(),
});
