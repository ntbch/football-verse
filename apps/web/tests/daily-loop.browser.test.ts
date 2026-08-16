import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const enabled = process.env.DAILY_LOOP_BROWSER_SMOKE === "1";

test("daily matchday journey keeps the match usable when contextual coverage is empty or retryable", { skip: !enabled }, async () => {
  const required = [
    "DAILY_LOOP_WEB_URL",
    "DAILY_LOOP_FIXTURE_ID",
    "DAILY_LOOP_STORY_TITLE",
    "DAILY_LOOP_THREAD_TITLE",
    "DAILY_LOOP_USER_THREAD_TITLE",
    "DAILY_LOOP_EMAIL",
    "DAILY_LOOP_PASSWORD",
    "PLAYWRIGHT_MODULE_PATH",
  ];
  const missing = required.filter((name) => !process.env[name]);
  assert.deepEqual(missing, [], `Daily Matchday browser smoke requires: ${missing.join(", ")}`);

  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH!);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);

  try {
    const fixtureId = process.env.DAILY_LOOP_FIXTURE_ID!;
    const storyTitle = process.env.DAILY_LOOP_STORY_TITLE!;
    const threadTitle = process.env.DAILY_LOOP_THREAD_TITLE!;
    const userThreadTitle = process.env.DAILY_LOOP_USER_THREAD_TITLE!;
    const webUrl = process.env.DAILY_LOOP_WEB_URL!;

    await page.goto(`${webUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]:visible').first().fill(process.env.DAILY_LOOP_EMAIL!);
    await page.locator('input[type="password"]:visible').first().fill(process.env.DAILY_LOOP_PASSWORD!);
    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForURL((url: URL) => !url.pathname.endsWith("/login"));

    await page.goto(`${webUrl}/matchday/${encodeURIComponent(fixtureId)}?league=premier-league`, { waitUntil: "domcontentloaded" });
    await page.getByRole("region", { name: "Related match coverage" }).waitFor();
    await page.getByRole("link", { name: storyTitle }).click();
    await page.getByRole("heading", { name: storyTitle }).waitFor();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: threadTitle }).click();
    await page.getByRole("heading", { name: threadTitle }).waitFor();

    await page.goto(`${webUrl}/matchday/${encodeURIComponent(fixtureId)}?league=premier-league`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Start discussion" }).click();
    await page.getByRole("dialog", { name: "Start a New Thread" }).waitFor();
    await page.getByPlaceholder("A clear, compelling title...").fill(userThreadTitle);
    await page.getByPlaceholder("Share your thoughts, analysis, or questions...").fill("Created by the deterministic Daily Matchday browser smoke.");
    await page.getByRole("button", { name: "Publish Thread" }).click();
    await page.getByText("Thread created successfully!", { exact: true }).waitFor();

    await page.goto(`${webUrl}/matchday/${encodeURIComponent(fixtureId)}?league=premier-league`, { waitUntil: "domcontentloaded" });
    await page.route("**/contexts/fixtures/**", async (route: { fulfill: (response: { status: number; contentType: string; body: string }) => Promise<void> }) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false }) });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("Match coverage is unavailable.", { exact: true }).waitFor();
    assert.ok(await page.locator("h1").count() >= 2, "The match headings disappeared when contextual coverage failed");

    await page.unroute("**/contexts/fixtures/**");
    await page.getByRole("button", { name: "Retry" }).click();
    await page.getByRole("link", { name: storyTitle }).waitFor();

    await page.route("**/contexts/fixtures/**", async (route: { fulfill: (response: { status: number; contentType: string; body: string }) => Promise<void> }) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { context: { id: 1, type: "FIXTURE", key: fixtureId, displayName: "Smoke context" }, news: [], threads: [] } }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("No published coverage or public discussion has been linked to this match yet.", { exact: true }).waitFor();
  } finally {
    await context.close();
    await browser.close();
  }
});
