package com.footballverse.telegram.scheduler;

import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.telegram.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramDigestScheduler {

    private final NewsArticleRepository newsArticleRepository;
    private final TelegramNotificationService telegramNotificationService;

    /**
     * Morning Digest: Triggered every day at 08:00 AM (server time).
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void publishMorningDigest() {
        log.info("[TelegramScheduler] Executing Morning Digest...");
        publishDigestForPeriod("Sáng", 12);
    }

    /**
     * Evening Digest: Triggered every day at 20:00 PM (server time).
     */
    @Scheduled(cron = "0 0 20 * * *")
    public void publishEveningDigest() {
        log.info("[TelegramScheduler] Executing Evening Digest...");
        publishDigestForPeriod("Tối", 12);
    }

    public boolean publishDigestForPeriod(String periodName, int hoursBack) {
        Instant since = Instant.now().minus(hoursBack, ChronoUnit.HOURS);
        List<NewsArticle> topArticles = newsArticleRepository.findTopTrendingArticles(since, PageRequest.of(0, 5));

        if (topArticles.isEmpty()) {
            log.info("[TelegramScheduler] No articles found for {} Digest.", periodName);
            return false;
        }

        String title = String.format("BẢN TIN BÓNG ĐÁ FOOTBALLVERSE (%s)", periodName);
        return telegramNotificationService.sendDailyDigest(topArticles, title);
    }
}
