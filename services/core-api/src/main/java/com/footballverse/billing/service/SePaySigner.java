package com.footballverse.billing.service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SePaySigner {
    private static final List<String> SIGNED_FIELDS = List.of(
            "order_amount", "merchant", "currency", "operation", "order_description",
            "order_invoice_number", "customer_id", "payment_method", "success_url",
            "error_url", "cancel_url"
    );

    private SePaySigner() {}

    public static String sign(Map<String, String> fields, String secretKey) {
        List<String> values = new ArrayList<>();
        for (String field : SIGNED_FIELDS) {
            String value = fields.get(field);
            if (value != null) values.add(field + "=" + value);
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(String.join(",", values).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not sign SePay checkout fields", exception);
        }
    }

    public static Map<String, String> orderedFields(String amount, String merchant, String currency,
                                                     String operation, String description, String invoice,
                                                     String paymentMethod, String successUrl, String errorUrl,
                                                     String cancelUrl, String secretKey) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("order_amount", amount);
        fields.put("merchant", merchant);
        fields.put("currency", currency);
        fields.put("operation", operation);
        fields.put("order_description", description);
        fields.put("order_invoice_number", invoice);
        fields.put("payment_method", paymentMethod);
        fields.put("success_url", successUrl);
        fields.put("error_url", errorUrl);
        fields.put("cancel_url", cancelUrl);
        fields.put("signature", sign(fields, secretKey));
        return fields;
    }
}
