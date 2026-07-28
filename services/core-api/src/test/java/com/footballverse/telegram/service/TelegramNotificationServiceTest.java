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
}
