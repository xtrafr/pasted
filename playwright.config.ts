import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const databaseURL =
	process.env.TEST_DATABASE_URL ??
	process.env.DATABASE_URL ??
	'postgres://pasted:pasted@127.0.0.1:5432/pasted';

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	timeout: 45_000,
	expect: { timeout: 7_500 },
	reporter: process.env.CI
		? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
		: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	outputDir: 'test-results/playwright',
	use: {
		baseURL,
		actionTimeout: 10_000,
		navigationTimeout: 20_000,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'off'
	},
	projects: [
		{
			name: 'chromium',
			testIgnore: '**/*.mobile.e2e.ts',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'mobile-chromium',
			testMatch: '**/*.mobile.e2e.ts',
			use: { ...devices['Pixel 7'] }
		}
	],
	webServer: {
		command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			...process.env,
			DATABASE_URL: databaseURL,
			ORIGIN: baseURL,
			BETTER_AUTH_SECRET:
				process.env.BETTER_AUTH_SECRET ?? 'playwright-only-secret-with-at-least-32-characters',
			NODE_ENV: 'test'
		}
	}
});
