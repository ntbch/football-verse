package com.footballverse.news.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class NewsEmbeddingService {

    private static final int MAX_EMBEDDING_TEXT_LENGTH = 8_000;

    @Value("${app.ai.gemini-api-key:}")
    private String apiKey;

    @Value("${app.ai.embedding-enabled:true}")
    private boolean enabled;

    @Value("${app.ai.embedding-model:gemini-embedding-001}")
    private String modelName;

    @Value("${app.ai.embedding-dimensions:768}")
    private int dimensions;

    private final ObjectMapper mapper;
    private final RestClient restClient;

    public NewsEmbeddingService(ObjectMapper mapper) {
        this.mapper = mapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public Optional<Embedding> embed(String title, String description) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        String text = embeddingText(title, description);
        if (text.isBlank()) {
            return Optional.empty();
        }

        try {
            String requestUrl = "https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent"
                    .formatted(modelName);
            Map<String, Object> requestBody = Map.of(
                    "model", "models/" + modelName,
                    "content", Map.of("parts", List.of(Map.of("text", text))),
                    "outputDimensionality", dimensions
            );

            String responseJson = restClient.post()
                    .uri(requestUrl)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode valuesNode = mapper.readTree(responseJson).path("embedding").path("values");
            if (!valuesNode.isArray() || valuesNode.isEmpty()) {
                log.warn("[NewsEmbedding] Gemini response did not contain embedding values");
                return Optional.empty();
            }

            double[] values = new double[valuesNode.size()];
            for (int index = 0; index < valuesNode.size(); index++) {
                values[index] = valuesNode.get(index).asDouble();
            }
            normalize(values);
            return Optional.of(new Embedding(modelName, values));
        } catch (Exception exception) {
            log.warn("[NewsEmbedding] Embedding generation failed; lexical clustering will be used: {}",
                    exception.getMessage());
            return Optional.empty();
        }
    }

    public String serialize(Embedding embedding) {
        try {
            return mapper.writeValueAsString(embedding.values());
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize news embedding", exception);
        }
    }

    public Optional<double[]> deserialize(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode root = mapper.readTree(value);
            if (!root.isArray() || root.isEmpty()) {
                return Optional.empty();
            }
            List<Double> values = new ArrayList<>(root.size());
            root.forEach(node -> values.add(node.asDouble()));
            double[] vector = new double[values.size()];
            for (int index = 0; index < values.size(); index++) {
                vector[index] = values.get(index);
            }
            normalize(vector);
            return Optional.of(vector);
        } catch (Exception exception) {
            log.warn("[NewsEmbedding] Ignoring invalid stored embedding: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    public double cosineSimilarity(double[] left, double[] right) {
        if (left == null || right == null || left.length == 0 || left.length != right.length) {
            return 0.0;
        }
        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;
        for (int index = 0; index < left.length; index++) {
            dot += left[index] * right[index];
            leftNorm += left[index] * left[index];
            rightNorm += right[index] * right[index];
        }
        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }

    private String embeddingText(String title, String description) {
        String content = (safe(title) + "\n" + safe(description)).trim();
        if (content.length() > MAX_EMBEDDING_TEXT_LENGTH) {
            content = content.substring(0, MAX_EMBEDDING_TEXT_LENGTH);
        }
        return "task: sentence similarity | query: " + content;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private void normalize(double[] values) {
        double normSquared = 0.0;
        for (double value : values) {
            normSquared += value * value;
        }
        if (normSquared == 0.0) {
            return;
        }
        double norm = Math.sqrt(normSquared);
        for (int index = 0; index < values.length; index++) {
            values[index] = values[index] / norm;
        }
    }

    public record Embedding(String model, double[] values) {
    }
}
