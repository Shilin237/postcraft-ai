import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/e2e', use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || '[]') } },
 webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: false, env: { APP_URL: 'http://localhost:5173', SESSION_SECRET: 'playwright-only-secret-not-for-real-deployments-123', APP_USERNAME: 'test-owner', APP_PASSWORD: 'test-only-password', ANTHROPIC_API_KEY: '' } }
});
