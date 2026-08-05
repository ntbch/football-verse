package com.footballverse.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.billing.config.BillingProperties;
import com.footballverse.billing.dto.ReconciliationResponse;
import com.footballverse.billing.model.PaymentOrder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class SePayReconciliationClient {
    private final BillingProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public ReconciliationResponse lookup(PaymentOrder order) {
        if (!properties.isReadyForProviderApi()) return response(order, "DISABLED", "Provider API credentials are not configured", null, null, null, null, null, null);
        if (order.getProviderOrderId() == null || order.getProviderOrderId().isBlank()) {
            return response(order, "AMBIGUOUS", "Local order has no provider order ID", null, null, null, null, null, null);
        }
        try {
            String token = Base64.getEncoder().encodeToString((properties.getMerchantId() + ":" + properties.getSecretKey()).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.getApiUrl().replaceAll("/$", "") + "/v1/order/detail/" + URLEncoder.encode(order.getProviderOrderId(), StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Basic " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) return response(order, "UNAUTHORIZED", "Provider rejected credentials", null, null, null, null, null, null);
            if (response.statusCode() == 429) return response(order, "RATE_LIMITED", "Provider rate limit reached", null, null, null, null, null, null);
            if (response.statusCode() / 100 != 2) return response(order, "PROVIDER_ERROR", "Provider returned HTTP " + response.statusCode(), null, null, null, null, null, null);
            JsonNode data = objectMapper.readTree(response.body()).path("data");
            Long amount = amount(data.path("order_amount").asText(null));
            JsonNode transactions = data.path("transactions");
            String transactionStatus = transactions.isArray() && !transactions.isEmpty() ? transactions.get(0).path("transaction_status").asText(null) : null;
            String providerOrderId = data.path("order_id").asText(null);
            String providerInvoice = data.path("order_invoice_number").asText(null);
            boolean exactMatch = order.getAmountVnd() == amount
                    && order.getCurrency().equalsIgnoreCase(data.path("order_currency").asText(null))
                    && order.getProviderOrderId().equals(providerOrderId)
                    && order.getInvoiceNumber().equals(providerInvoice);
            String outcome = exactMatch ? "MATCH" : "MISMATCH";
            return response(order, outcome, null, providerOrderId, providerInvoice,
                    data.path("order_status").asText(null), amount, data.path("order_currency").asText(null), transactionStatus);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return response(order, "TIMEOUT", "Provider request interrupted", null, null, null, null, null, null);
        } catch (Exception exception) {
            return response(order, "PROVIDER_ERROR", "Provider lookup failed", null, null, null, null, null, null);
        }
    }

    private Long amount(String raw) {
        if (raw == null) return null;
        try { return new BigDecimal(raw).stripTrailingZeros().longValueExact(); }
        catch (ArithmeticException exception) { return null; }
    }

    private ReconciliationResponse response(PaymentOrder order, String outcome, String error, String providerOrderId,
                                            String providerInvoice, String providerStatus, Long amount, String currency,
                                            String transactionStatus) {
        return new ReconciliationResponse(order.getInvoiceNumber(), providerOrderId, providerInvoice, providerStatus,
                amount, currency, transactionStatus, outcome, error);
    }
}
