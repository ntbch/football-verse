package com.footballverse.billing.service;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SePaySignerTest {
    @Test
    void signsTheDocumentedFieldOrder() throws Exception {
        var fields = SePaySigner.orderedFields(
                "99000", "merchant-1", "VND", "PURCHASE", "Premium", "FV123", "BANK_TRANSFER",
                "https://example.test/success", "https://example.test/error", "https://example.test/cancel", "secret"
        );

        assertThat(fields.keySet()).containsExactly(
                "order_amount", "merchant", "currency", "operation", "order_description",
                "order_invoice_number", "payment_method", "success_url", "error_url", "cancel_url", "signature"
        );
        String canonical = String.join(",", List.of(
                "order_amount=99000", "merchant=merchant-1", "currency=VND", "operation=PURCHASE",
                "order_description=Premium", "order_invoice_number=FV123", "payment_method=BANK_TRANSFER",
                "success_url=https://example.test/success", "error_url=https://example.test/error",
                "cancel_url=https://example.test/cancel"
        ));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        assertThat(fields.get("signature")).isEqualTo(Base64.getEncoder().encodeToString(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8))));
    }
}
