package com.footballverse.telegram.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramNotificationServiceTest {

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
