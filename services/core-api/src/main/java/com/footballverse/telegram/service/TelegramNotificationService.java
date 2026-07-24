package com.footballverse.telegram.service;

import com.footballverse.news.model.NewsArticle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationService {

    @Value("${app.telegram.enabled:true}")
    private boolean enabled;

    @Value("${app.telegram.bot-token:}")
    private String botToken;

    @Value("${app.telegram.channel-id:@footballverse_news}")
    private String channelId;

    @Value("${app.gateway.url:https://footballverse.app}")
    private String gatewayUrl;

    // 20-minute cooldown cache to prevent duplicate breaking news pushes
    private final ConcurrentHashMap<Long, Instant> pushedArticlesCache = new ConcurrentHashMap<>();

    private static final Pattern BREAKING_KEYWORDS = Pattern.compile(
            "(?i)\\b(here we go|breaking|official|deal agreed|done deal|signing|medical|bid accepted|sacked|appointed|injury|transfer)\\b"
    );

    private RestClient createRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(8000);
        return RestClient.builder().requestFactory(factory).build();
    }

    public boolean sendHtmlMessage(String htmlText) {
        return sendHtmlMessageWithButton(htmlText, null, null);
    }

    public boolean sendHtmlMessageToChat(String targetChatId, String htmlText) {
        return sendHtmlMessageWithButtonToChat(targetChatId, htmlText, null, null);
    }

    public boolean sendHtmlMessageWithButton(String htmlText, String buttonText, String buttonUrl) {
        return sendHtmlMessageWithButtonToChat(channelId, htmlText, buttonText, buttonUrl);
    }

    /**
     * Sends an HTML-formatted message with optional Inline Keyboard Button.
     */
    public boolean sendHtmlMessageWithButtonToChat(String targetChatId, String htmlText, String buttonText, String buttonUrl) {
        if (!enabled || botToken == null || botToken.isBlank() || targetChatId == null || targetChatId.isBlank()) {
            log.debug("[Telegram] Service disabled or credentials missing. Skipping notification.");
            return false;
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            
            RestClient client = createRestClient();
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", targetChatId);
            body.put("text", htmlText);
            body.put("parse_mode", "HTML");
            body.put("disable_web_page_preview", false);

            if (buttonText != null && !buttonText.isBlank() && buttonUrl != null && !buttonUrl.isBlank()) {
                Map<String, Object> button = Map.of("text", buttonText, "url", buttonUrl);
                List<List<Map<String, Object>>> inlineKeyboard = List.of(List.of(button));
                body.put("reply_markup", Map.of("inline_keyboard", inlineKeyboard));
            }

            client.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[Telegram] Successfully sent text message to channel: {}", targetChatId);
            return true;
        } catch (Exception e) {
            log.error("[Telegram] Failed to send text message to channel {}: {}", targetChatId, e.getMessage());
            return false;
        }
    }

    /**
     * Sends a Photo Banner card using the REAL article image URL.
     * If photoUrl is null or invalid, falls back cleanly to text message without fake placeholders.
     */
    public boolean sendPhotoMessage(String photoUrl, String captionHtml, String buttonText, String buttonUrl) {
        return sendPhotoMessageToChat(channelId, photoUrl, captionHtml, buttonText, buttonUrl);
    }

    public boolean sendPhotoMessageToChat(String targetChatId, String photoUrl, String captionHtml, String buttonText, String buttonUrl) {
        if (!enabled || botToken == null || botToken.isBlank() || targetChatId == null || targetChatId.isBlank()) {
            return false;
        }

        // If no real image URL is available, send clean text message instead of fake placeholders
        if (photoUrl == null || !photoUrl.startsWith("http")) {
            log.debug("[Telegram] No valid real photo URL provided for article. Falling back to clean text message.");
            return sendHtmlMessageWithButtonToChat(targetChatId, captionHtml, buttonText, buttonUrl);
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendPhoto";
            
            RestClient client = createRestClient();
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", targetChatId);
            body.put("photo", photoUrl);
            body.put("caption", captionHtml);
            body.put("parse_mode", "HTML");

            if (buttonText != null && !buttonText.isBlank() && buttonUrl != null && !buttonUrl.isBlank()) {
                Map<String, Object> button = Map.of("text", buttonText, "url", buttonUrl);
                List<List<Map<String, Object>>> inlineKeyboard = List.of(List.of(button));
                body.put("reply_markup", Map.of("inline_keyboard", inlineKeyboard));
            }

            client.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[Telegram] Successfully sent real photo card to channel: {}", targetChatId);
            return true;
        } catch (Exception e) {
            log.warn("[Telegram] Failed to send photo card ({}), falling back to text message.", e.getMessage());
            return sendHtmlMessageWithButtonToChat(targetChatId, captionHtml, buttonText, buttonUrl);
        }
    }

    /**
     * Checks if an imported article qualifies as High-Trust Breaking News and pushes it instantly.
     */
    @Async
    public void checkAndPushBreakingNews(NewsArticle article) {
        if (article == null || article.getId() == null) return;

        // Clean cache entries older than 30 minutes
        Instant expireTime = Instant.now().minus(30, ChronoUnit.MINUTES);
        pushedArticlesCache.entrySet().removeIf(entry -> entry.getValue().isBefore(expireTime));

        // Deduplication check
        if (pushedArticlesCache.containsKey(article.getId())) {
            log.debug("[Telegram] Article {} already pushed recently. Skipping.", article.getId());
            return;
        }

        // Trust score check (publisher trust >= 0.90 or trusted sources)
        double trustScore = (article.getSource() != null && article.getSource().getPublisher() != null && article.getSource().getPublisher().getTrustScore() != null)
                ? article.getSource().getPublisher().getTrustScore().doubleValue()
                : 0.95;
        if (trustScore < 0.90) {
            log.debug("[Telegram] Article {} trust score ({}) below threshold 0.90. Skipping instant push.", article.getId(), trustScore);
            return;
        }

        // Keyword matching check
        String textToScan = (article.getTitle() + " " + (article.getSummary() != null ? article.getSummary() : ""));
        if (!BREAKING_KEYWORDS.matcher(textToScan).find()) {
            return;
        }

        // Mark as pushed
        pushedArticlesCache.put(article.getId(), Instant.now());

        // Construct HTML Message
        String webNewsUrl = gatewayUrl + "/news/" + article.getSlug();
        String htmlMessage = String.format(
                "🔥 <b>HERE WE GO! BREAKING NEWS</b>\n\n" +
                "<b>%s</b>\n\n" +
                "%s",
                escapeHtml(article.getTitle()),
                escapeHtml(article.getSummary() != null ? truncateSummary(article.getSummary()) : "")
        );

        String realImageUrl = resolveArticleImage(article);

        log.info("[Telegram] Instant Breaking News detected for article id={}: {}", article.getId(), article.getTitle());
        sendPhotoMessage(realImageUrl, htmlMessage, "📖 Đọc bài viết trên FootballVerse ➔", webNewsUrl);
    }

    /**
     * Formats and pushes a top 5 daily news digest.
     */
    public boolean sendDailyDigest(List<NewsArticle> articles, String digestTitle) {
        if (articles == null || articles.isEmpty()) return false;

        StringBuilder sb = new StringBuilder();
        sb.append("📰 <b>").append(escapeHtml(digestTitle)).append("</b>\n\n");

        for (int i = 0; i < Math.min(articles.size(), 5); i++) {
            NewsArticle art = articles.get(i);
            String url = gatewayUrl + "/news/" + art.getSlug();
            sb.append(String.format(
                    "%d. ⚽ <b>%s</b>\n   🔗 <a href=\"%s\">Đọc tin</a>\n\n",
                    i + 1,
                    escapeHtml(art.getTitle()),
                    url
            ));
        }

        String homeUrl = gatewayUrl + "/news";
        String topRealImageUrl = resolveArticleImage(articles.get(0));
        return sendPhotoMessage(topRealImageUrl, sb.toString(), "🌐 Trang tin tức FootballVerse ➔", homeUrl);
    }

    private String resolveArticleImage(NewsArticle article) {
        if (article == null) return null;
        if (article.getImageUrl() != null && article.getImageUrl().startsWith("http")) {
            return article.getImageUrl();
        }
        if (article.getHeroRawItem() != null && article.getHeroRawItem().getImageUrl() != null && article.getHeroRawItem().getImageUrl().startsWith("http")) {
            return article.getHeroRawItem().getImageUrl();
        }
        return null;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;");
    }

    private String truncateSummary(String text) {
        if (text.length() <= 180) return text;
        return text.substring(0, 177) + "...";
    }
}
