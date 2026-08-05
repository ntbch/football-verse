package com.footballverse.news.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Slf4j
public class AiSummaryService {

    @Value("${app.ai.gemini-api-key:}")
    private String apiKey;

    @Value("${app.ai.gemini-model:gemini-3.5-flash}")
    private String modelName;

    @Value("${app.ai.daily-limit:20}")
    private int dailyLimit;

    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicInteger dailyCallCounter = new AtomicInteger(0);
    private final AtomicReference<LocalDate> counterDate = new AtomicReference<>(LocalDate.now());
    private final AtomicReference<Instant> blockedUntil = new AtomicReference<>();

    public record SummaryResult(String summary, List<String> keyPoints, boolean aiGenerated) {}

    public SummaryResult fallbackSummaryAndKeyPoints(String title, String defaultFallback) {
        return createFallbackResult(title, defaultFallback);
    }

    private RestClient createRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(12000);
        return RestClient.builder().requestFactory(factory).build();
    }

    private void checkAndResetDailyCounter() {
        LocalDate today = LocalDate.now();
        if (!today.equals(counterDate.get())) {
            counterDate.set(today);
            dailyCallCounter.set(0);
            blockedUntil.set(null);
        }
    }

    public SummaryResult generateSummaryAndKeyPoints(String title, String rawContent, String defaultFallback) {
        checkAndResetDailyCounter();

        // ponytail: fallback to raw item description if AI key missing or daily quota reached
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[AiSummary] GEMINI_API_KEY is not configured. Using fallback summary.");
            return createFallbackResult(title, defaultFallback);
        }

        Instant blockedUntilValue = blockedUntil.get();
        if (blockedUntilValue != null && blockedUntilValue.isAfter(Instant.now())) {
            log.warn("[AiSummary] Gemini circuit is open until {}. Using fallback summary.", blockedUntilValue);
            return createFallbackResult(title, defaultFallback);
        }

        if (dailyCallCounter.get() >= dailyLimit) {
            log.warn("[AiSummary] Daily AI quota limit reached ({}/{}). Using fallback summary.", dailyCallCounter.get(), dailyLimit);
            return createFallbackResult(title, defaultFallback);
        }

        try {
            String prompt = """
                    You are an elite football news analyst and chief editor for FootballVerse.
                    Analyze the following football news item and generate:
                    1. A comprehensive, detailed summary (2 rich paragraphs, approximately 150-200 words) explaining the full context, background, key figures involved, transfer fees or stats if applicable, and broader tactical or league implications.
                    2. Exactly 3 distinct, insightful key takeaways or highlights with specific details.

                    Return the result strictly as a valid JSON object in English with format:
                    {
                      "summary": "Paragraph 1...\\n\\nParagraph 2...",
                      "keyPoints": [
                        "Insightful key takeaway 1...",
                        "Insightful key takeaway 2...",
                        "Insightful key takeaway 3..."
                      ]
                    }

                    Title: %s
                    Content: %s
                    """.formatted(title != null ? title : "", rawContent != null ? rawContent : "");

            String requestUrl = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s"
                    .formatted(modelName, apiKey);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of(
                            "responseMimeType", "application/json",
                            "temperature", 0.3
                    )
            );

            dailyCallCounter.incrementAndGet();

            RestClient client = createRestClient();
            String responseJson = client.post()
                    .uri(requestUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(responseJson);
            JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
            if (textNode.isMissingNode()) {
                log.warn("[AiSummary] Gemini API response missing text parts. Falling back.");
                return createFallbackResult(title, defaultFallback);
            }

            JsonNode jsonResult = mapper.readTree(textNode.asText());
            String summary = jsonResult.path("summary").asText("");
            List<String> keyPoints = new ArrayList<>();
            JsonNode pointsNode = jsonResult.path("keyPoints");
            if (pointsNode.isArray()) {
                pointsNode.forEach(p -> keyPoints.add(p.asText()));
            }

            if (summary.isBlank()
                    || keyPoints.size() != 3
                    || keyPoints.stream().anyMatch(point -> point == null || point.isBlank())) {
                log.warn("[AiSummary] Gemini response violated summary/3-key-point contract. Falling back.");
                return createFallbackResult(title, defaultFallback);
            }

            log.info("[AiSummary] Successfully generated AI summary via Gemini ({}) [Daily calls: {}/{}]",
                    modelName, dailyCallCounter.get(), dailyLimit);

            return new SummaryResult(summary, List.copyOf(keyPoints), true);

        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 429) {
                long retryAfterMs = retryAfterMs(e);
                Instant until = Instant.now().plusMillis(retryAfterMs);
                blockedUntil.set(until);
                log.warn("[AiSummary] Gemini quota response; circuit open until {}.", until);
            }
            log.warn("[AiSummary] Gemini HTTP failure ({}), using fallback.", e.getStatusCode().value());
            return createFallbackResult(title, defaultFallback);
        } catch (Exception e) {
            log.warn("[AiSummary] Failed to generate AI summary via Gemini ({}), using fallback: {}", e.getClass().getSimpleName(), e.getMessage());
            return createFallbackResult(title, defaultFallback);
        }
    }

    private SummaryResult createFallbackResult(String title, String defaultFallback) {
        String cleanTitle = title != null ? title.replaceAll("(?i)\\s+(BBC|Sky Sports|Reuters|GNews|ESPN|Goal|The Guardian)$", "").trim() : "Football Update";
        String rawDesc = (defaultFallback != null && !defaultFallback.isBlank()) ? defaultFallback : cleanTitle;
        String cleanSummary = rawDesc.replaceAll("(?i)\\s+(BBC|Sky Sports|Reuters|GNews|ESPN|Goal|The Guardian)$", "").trim();

        if (cleanSummary.isBlank() || cleanSummary.equalsIgnoreCase(cleanTitle)) {
            cleanSummary = cleanTitle + ". Official reports and media outlets are tracking the latest developments regarding this football story.";
        }

        List<String> keyPoints = List.of(
                cleanTitle,
                "Key stakeholders and club representatives are monitoring the situation.",
                "Stay tuned to FootballVerse for verified updates and ongoing coverage."
        );

        return new SummaryResult(cleanSummary, keyPoints, false);
    }

    private long retryAfterMs(RestClientResponseException exception) {
        String value = exception.getResponseHeaders() == null
                ? null
                : exception.getResponseHeaders().getFirst("Retry-After");
        if (value == null || value.isBlank()) return Duration.ofSeconds(60).toMillis();
        try {
            return Math.min(Math.max(Long.parseLong(value.trim()) * 1000L, 1000L), Duration.ofHours(24).toMillis());
        } catch (NumberFormatException ignored) {
            try {
                return Math.min(Math.max(Instant.parse(value.trim()).toEpochMilli() - Instant.now().toEpochMilli(), 1000L), Duration.ofHours(24).toMillis());
            } catch (Exception ignoredDate) {
                return Duration.ofSeconds(60).toMillis();
            }
        }
    }
}
