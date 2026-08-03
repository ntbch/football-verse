package com.footballverse.news.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AiSummaryServiceTest {

    @Test
    @DisplayName("When GEMINI_API_KEY is blank, fallback summary is returned cleanly")
    void testFallbackWhenApiKeyIsMissing() {
        AiSummaryService service = new AiSummaryService();
        ReflectionTestUtils.setField(service, "apiKey", "");
        ReflectionTestUtils.setField(service, "dailyLimit", 100);

        AiSummaryService.SummaryResult result = service.generateSummaryAndKeyPoints(
                "Arsenal Win 3-0 Against Chelsea",
                "Arsenal produced a dominant performance at the Emirates...",
                "Arsenal scored three goals in a dominant victory."
        );

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.summary()).isEqualTo("Arsenal scored three goals in a dominant victory.");
        assertThat(result.keyPoints()).contains("Arsenal Win 3-0 Against Chelsea");
        assertThat(result.keyPoints()).hasSize(3);
    }

    @Test
    @DisplayName("When daily quota limit is reached, fallback summary is returned")
    void testFallbackWhenQuotaLimitReached() {
        AiSummaryService service = new AiSummaryService();
        ReflectionTestUtils.setField(service, "apiKey", "mock-api-key");
        ReflectionTestUtils.setField(service, "dailyLimit", 0);

        AiSummaryService.SummaryResult result = service.generateSummaryAndKeyPoints(
                "Real Madrid Sign New Striker",
                "Real Madrid have announced the signing of...",
                "Real Madrid complete striker signing."
        );

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.summary()).isEqualTo("Real Madrid complete striker signing.");
    }

    @Test
    @DisplayName("When the circuit is open, Gemini is skipped and fallback keeps exactly three key points")
    void testFallbackWhenCircuitIsOpen() {
        AiSummaryService service = new AiSummaryService();
        ReflectionTestUtils.setField(service, "apiKey", "mock-api-key");
        ReflectionTestUtils.setField(service, "dailyLimit", 20);
        ReflectionTestUtils.setField(service, "blockedUntil",
                new AtomicReference<>(Instant.now().plusSeconds(60)));

        AiSummaryService.SummaryResult result = service.generateSummaryAndKeyPoints(
                "Liverpool win",
                "Liverpool won the match.",
                "Liverpool won the match."
        );

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.keyPoints()).hasSize(3);
        assertThat(result.keyPoints()).allMatch(point -> point != null && !point.isBlank());
    }
}
