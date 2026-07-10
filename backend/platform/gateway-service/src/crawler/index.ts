import { startCronScheduler, runCrawlCycle } from "./cron-scheduler";

export function startCrawlerWorker() {
  if (process.env.ENABLE_CRAWLER !== "true") {
    console.log("[Crawler] disabled");
    return;
  }

  startCronScheduler();
}

export async function triggerCrawlManually() {
  return runCrawlCycle();
}
