const playwrightModule = process.env.PLAYWRIGHT_MODULE_PATH || "playwright";
const { chromium } = require(playwrightModule);

const webBaseUrl = process.env.SMOKE_WEB_URL || "http://127.0.0.1:13000";
const apiBaseUrl = process.env.SMOKE_API_URL || "http://127.0.0.1:18000/api/v1";

async function main() {
  console.log("browser-smoke: launching");
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox"],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOptions);
  console.log("browser-smoke: launched");
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
  const refreshStatuses = [];
  const clientErrors = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith("/auth/refresh")) {
      refreshStatuses.push(`${response.request().method()}:${response.status()}`);
    }
  });
  page.on("pageerror", (error) => clientErrors.push(`client error: ${error.name || "Error"}`));
  page.on("requestfailed", (request) => {
    if (request.url().includes("/auth/refresh")) {
      clientErrors.push(`refresh request failed: ${request.failure()?.errorText || "unknown"}`);
    }
  });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const email = `browser-${suffix}@example.test`;
  const username = `browser_${suffix.replace(/-/g, "_")}`.slice(0, 40);
  const password = "BrowserOnlyPassword123!";

  try {
    // Seed the generated account outside the browser context so the test starts
    // unauthenticated and must exercise the real login UI.
    const registration = await fetch(`${apiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!registration.ok) throw new Error(`Browser account setup failed (${registration.status})`);
    console.log("browser-smoke: account ready");

    const hydrationResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith("/auth/refresh"),
      { timeout: 20_000 },
    );
    await page.goto(`${webBaseUrl}/login`, { waitUntil: "domcontentloaded" });
    await hydrationResponsePromise;
    console.log("browser-smoke: login page ready");

    await page.locator('input[type="email"]:visible').first().fill(email);
    await page.locator('input[type="password"]:visible').first().fill(password);
    const loginResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith("/auth/login"),
      { timeout: 30_000 },
    );
    await page.locator('button[type="submit"]:visible').first().click();
    const loginResponse = await loginResponsePromise;
    if (!loginResponse.ok()) {
      let safeMessage = "no response message";
      try {
        const body = await loginResponse.json();
        safeMessage = typeof body?.message === "string" ? body.message : safeMessage;
      } catch {
        // Deliberately avoid logging raw response bodies from authentication APIs.
      }
      throw new Error(`Login API failed (${loginResponse.status()}: ${safeMessage})`);
    }
    console.log("browser-smoke: login accepted");
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 });
    console.log("browser-smoke: login navigation complete");
    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByText(username, { exact: true }).waitFor();

    const storageBeforeReload = await page.evaluate(() => ({
      local: Object.values(localStorage),
      session: Object.values(sessionStorage),
      cookie: document.cookie,
    }));
    if (storageBeforeReload.local.length || storageBeforeReload.session.length) {
      throw new Error("Authentication data entered Web Storage");
    }
    if (storageBeforeReload.cookie.includes("football_verse_refresh")) {
      throw new Error("Refresh cookie is readable by JavaScript");
    }

    const refreshCookie = (await context.cookies(`${apiBaseUrl}/auth/refresh`))
      .find((cookie) => cookie.name === "football_verse_refresh");
    if (!refreshCookie?.httpOnly || refreshCookie.sameSite !== "Lax") {
      throw new Error("Refresh cookie attributes are unsafe");
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    try {
      await page.getByRole("button", { name: "Open account menu" }).waitFor({ timeout: 30_000 });
    } catch {
      const path = new URL(page.url()).pathname;
      throw new Error(`Session did not restore (refresh statuses: ${refreshStatuses.join(",") || "none"}; client errors: ${clientErrors.slice(0, 2).join(" | ") || "none"}; path: ${path})`);
    }
    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByText(username, { exact: true }).waitFor();
    console.log("browser-smoke: session restored");
    if (page.url().includes(email) || page.url().includes(username)) {
      throw new Error("Private identity entered the URL");
    }

    await page.getByRole("button", { name: "Logout" }).click();
    await page.waitForURL(/\/login$/, { timeout: 30_000 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('a[href="/login"]:visible').first().waitFor({ timeout: 30_000 });
    if (await page.getByText(username, { exact: true }).count()) {
      throw new Error("Prior account remained visible after logout/back navigation");
    }

    console.log(JSON.stringify({ status: "passed", checks: ["memory-only", "reload", "httponly", "logout", "back-navigation"] }));
  } finally {
    await Promise.race([
      (async () => {
        await context.close();
        await browser.close();
      })(),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(`Browser auth smoke failed: ${error.message}`);
    process.exit(1);
  },
);
