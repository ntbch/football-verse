import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { FingerprintGenerator } from 'fingerprint-generator';

const fingerprintGenerator = new FingerprintGenerator({
  browsers: [{ name: 'chrome', minVersion: 100 }],
  devices: ['desktop'],
  operatingSystems: ['windows', 'macos', 'linux'],
});

// A simple sequential queue lock to limit Playwright concurrency to exactly 1 active tab
let playwrightQueue = Promise.resolve();

/**
 * Execute a scraping task using Playwright sequentially to protect server resources.
 * Handles browser launch, fingerprint spoofing, clean resource teardown, and queueing.
 */
export async function runInBrowser<T>(task: (page: Page) => Promise<T>): Promise<T> {
  const result = playwrightQueue.then(async () => {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    try {
      console.log('[Playwright] Starting browser session sequentially...');
      
      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
      
      browser = await chromium.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run'
        ]
      });

      // Generate a realistic fingerprint
      const { fingerprint } = fingerprintGenerator.getFingerprint() as any;
      
      context = await browser.newContext({
        userAgent: fingerprint.userAgent,
        viewport: {
          width: fingerprint.screenWidth || 1920,
          height: fingerprint.screenHeight || 1080,
        },
        deviceScaleFactor: fingerprint.deviceScaleFactor || 1,
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      const page = await context.newPage();
      
      // Reduce bandwidth: Block image/media/stylesheet loads for feed/sitemap parsing
      // Note: We block stylesheets/fonts/media, but keep images optionally (some sites check images).
      // For general feed/sitemap loading, we can block images to save bandwidth.
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Execute the user-provided scraping logic
      return await task(page);

    } finally {
      // Always cleanup resources cleanly to avoid RAM leaks
      if (context) {
        try {
          await context.close();
        } catch (e) {
          console.error('[Playwright] Error closing browser context:', e);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('[Playwright] Error closing browser instance:', e);
        }
      }
      console.log('[Playwright] Browser session completed and resources freed.');
    }
  });

  // Chain the queue so that the next execution waits for this one to complete, even if it failed
  playwrightQueue = result.catch(() => {}).then(() => {});

  return result;
}
