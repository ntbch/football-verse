package com.footballverse.telegram.service;

import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.model.Publisher;
import com.footballverse.telegram.repository.TelegramDeliveryOutboxRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class TelegramNotificationServiceTest {

    @Test
    void doesNotQueueInstantNotificationsWhenTheyAreDisabled() {
        TelegramDeliveryOutboxRepository outbox = mock(TelegramDeliveryOutboxRepository.class);
        TelegramNotificationService service = new TelegramNotificationService(outbox);
        ReflectionTestUtils.setField(service, "instantBreakingEnabled", false);

        NewsArticle article = new NewsArticle();
        article.setId(1L);
        article.setTitle("Breaking transfer");
        Publisher publisher = new Publisher();
        publisher.setTrustScore(new BigDecimal("0.9500"));
        NewsSource source = new NewsSource();
        source.setPublisher(publisher);
        article.setSource(source);
        service.checkAndPushBreakingNews(article);

        verifyNoInteractions(outbox);
    }

    @Test
    void removesLocalOrInvalidTelegramButtonUrls() {
        assertThat(TelegramNotificationService.telegramButtonUrl("http://localhost:3000/news")).isNull();
        assertThat(TelegramNotificationService.telegramButtonUrl("not a url")).isNull();
        assertThat(TelegramNotificationService.telegramButtonUrl("https://football.example/news")).isEqualTo("https://football.example/news");
    }

    @Test
    void resolvesPublicArticleMediaForTelegram() {
        assertThat(TelegramNotificationService.telegramPhotoUrl("/uploads/cover.jpg", "https://football.example/"))
                .isEqualTo("https://football.example/api/v1/uploads/cover.jpg");
        assertThat(TelegramNotificationService.telegramPhotoUrl("https://cdn.example/cover.jpg", "https://football.example"))
                .isEqualTo("https://cdn.example/cover.jpg");
        assertThat(TelegramNotificationService.telegramPhotoUrl("javascript:alert(1)", "https://football.example"))
                .isNull();
    }
}
