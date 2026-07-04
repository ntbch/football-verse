package com.footballverse.crawl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RssScheduler {
    private final CrawlService crawlService;

    @Value("${app.crawl.startup-enabled:true}")
    private boolean startupEnabled;

    // ponytail: single global cron; per-source cronExpression is YAGNI until >50 sources.
    @Scheduled(cron = "${app.crawl.cron:0 0 * * * *}")
    public void scheduleCrawl() {
        log.info("Scheduled crawl job started.");
        try {
            CrawlService.CrawlResult result = crawlService.crawl();
            log.info("Scheduled crawl completed. Saved {}, repaired {}, skipped {}, failed {}.",
                    result.saved(), result.repaired(), result.skipped(), result.failed());
        } catch (Exception e) {
            log.error("Scheduled crawl failed", e);
        }
    }

    @Async("crawlExecutor")
    @EventListener(ApplicationReadyEvent.class)
    public void crawlOnStartup() {
        if (!startupEnabled) return;
        log.info("Application ready. Running initial crawl in background...");
        try {
            CrawlService.CrawlResult result = crawlService.crawl();
            log.info("Initial crawl completed. Saved {}, repaired {}, skipped {}, failed {}.",
                    result.saved(), result.repaired(), result.skipped(), result.failed());
        } catch (Exception e) {
            log.error("Initial crawl failed", e);
        }
    }
}