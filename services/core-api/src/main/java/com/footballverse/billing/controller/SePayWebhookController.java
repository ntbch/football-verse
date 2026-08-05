package com.footballverse.billing.controller;

import com.footballverse.billing.dto.SePayBankHubRequest;
import com.footballverse.billing.dto.SePayIpnRequest;
import com.footballverse.billing.service.BillingService;
import com.footballverse.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/billing/webhooks")
@RequiredArgsConstructor
public class SePayWebhookController {
    private final BillingService billingService;

    @PostMapping("/sepay")
    public ResponseEntity<ApiResponse<String>> sepay(
            @RequestHeader(name = "X-Secret-Key", required = false) String secret,
            @RequestBody(required = false) SePayIpnRequest payload
    ) {
        BillingService.WebhookResult result = billingService.processIpn(secret, payload);
        if (result == BillingService.WebhookResult.UNAUTHORIZED) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        return ResponseEntity.ok(ApiResponse.ok(result.name(), result.name()));
    }

    @PostMapping("/sepay-bankhub")
    public ResponseEntity<ApiResponse<String>> bankHub(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody(required = false) SePayBankHubRequest payload
    ) {
        BillingService.WebhookResult result = billingService.processBankHubIpn(authorization, payload);
        if (result == BillingService.WebhookResult.UNAUTHORIZED) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        return ResponseEntity.ok(ApiResponse.ok(result.name(), result.name()));
    }
}
