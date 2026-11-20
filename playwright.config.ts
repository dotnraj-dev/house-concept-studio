import {defineConfig, devices} from '@playwright/test';

/**
 * End-to-end tests run the demo build (VITE_DEMO_MODE=true: browser-only API, no database) in the locally
 * installed Chrome. Viewports: desktop, iPad (touch) and phone. WebKit is not used because it needs a large
 * browser download; Safari-specific checks remain manual (see E2E-REPORT.md).
 */
const port = Number(process.env.E2E_PORT || 5262);

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: {timeout: 60_000},
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {baseURL: `http://127.0.0.1:${port}`, channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  projects: [
    {name: 'desktop', use: {viewport: {width: 1440, height: 900}}},
    {name: 'ipad', use: {viewport: {width: 1180, height: 820}, hasTouch: true, userAgent: devices['iPad Pro 11 landscape'].userAgent}},
    {name: 'phone', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['Pixel 7'].userAgent}},
  ],
  webServer: {command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`, env: {VITE_DEMO_MODE: 'true'}, url: `http://127.0.0.1:${port}`, reuseExistingServer: true, timeout: 180_000},
});
