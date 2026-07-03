package com.footballverse.news;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RssScheduler {
    private final NewsService newsService;

    @Scheduled(cron = "${app.crawl.cron:0 0 * * * *}")
    public void scheduleCrawl() {
        log.info("Scheduled RSS crawl job started.");
        try {
            int crawled = newsService.crawl();
            log.info("Scheduled RSS crawl completed. Saved {} new articles.", crawled);
        } catch (Exception e) {
            log.error("Scheduled RSS crawl failed", e);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void crawlOnStartup() {
        log.info("Application ready. Running initial RSS crawl in background...");
        new Thread(() -> {
            try {
                // Wait briefly for startup logs to settle
                Thread.sleep(2000);
                int crawled = newsService.crawl();
                log.info("Initial RSS crawl completed. Saved {} new articles.", crawled);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                log.error("Initial RSS crawl failed", e);
            }
        }).start();
    }
}
