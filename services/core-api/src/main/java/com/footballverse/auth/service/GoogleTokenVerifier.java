package com.footballverse.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.common.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

/**
 * Verifies Google ID tokens against the tokeninfo endpoint using one shared
 * HttpClient with strict connect/response timeouts, so a hung upstream call
 * can never pin a servlet thread or a database connection.
 */
@Component
public class GoogleTokenVerifier {
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.google.client-id:}")
    private String googleClientId;

    public JsonNode verify(String idToken) {
        try {
            if (googleClientId.isBlank()) {
                throw new BadRequestException("Google Sign-In is not configured");
            }
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(TOKENINFO_URL + URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                    .timeout(TIMEOUT)
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new BadRequestException("Invalid Google token");
            }
            JsonNode payload = mapper.readTree(response.body());

            String issuer = payload.path("iss").asText();
            if (!"accounts.google.com".equals(issuer) && !"https://accounts.google.com".equals(issuer)) {
                throw new BadRequestException("Invalid Google token");
            }
            if (!googleClientId.equals(payload.path("aud").asText())
                    || !"true".equalsIgnoreCase(payload.path("email_verified").asText())
                    || payload.path("email").asText().isBlank()
                    || payload.path("sub").asText().isBlank()
                    || payload.path("exp").asLong(0) <= Instant.now().getEpochSecond()) {
                throw new BadRequestException("Invalid Google token");
            }
            return payload;
        } catch (BadRequestException exception) {
            throw exception;
        } catch (java.io.IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new BadRequestException("Failed to verify Google token");
        }
    }
}
