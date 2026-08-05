package com.footballverse.billing.controller;

import com.footballverse.billing.dto.BillingPlanResponse;
import com.footballverse.billing.dto.CreatePaymentOrderRequest;
import com.footballverse.billing.dto.MembershipResponse;
import com.footballverse.billing.dto.PaymentOrderResponse;
import com.footballverse.billing.service.BillingService;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {
    private final BillingService billingService;

    @GetMapping("/plans")
    public ApiResponse<List<BillingPlanResponse>> plans() {
        return ApiResponse.ok(billingService.plans());
    }

    @GetMapping("/me")
    public ApiResponse<MembershipResponse> membership() {
        return ApiResponse.ok(billingService.membership());
    }

    @PostMapping("/orders")
    public ApiResponse<PaymentOrderResponse> createOrder(
            @Valid @RequestBody CreatePaymentOrderRequest request,
            @RequestHeader(name = "X-Request-ID") UUID requestId
    ) {
        return ApiResponse.ok(billingService.createOrder(request, requestId));
    }

    @GetMapping("/orders/{invoiceNumber}")
    public ApiResponse<PaymentOrderResponse> order(@PathVariable String invoiceNumber) {
        return ApiResponse.ok(billingService.order(invoiceNumber));
    }

    @DeleteMapping("/orders/{invoiceNumber}")
    public ApiResponse<Map<String, Boolean>> hideOrder(@PathVariable String invoiceNumber) {
        billingService.hideOrder(invoiceNumber);
        return ApiResponse.ok(Map.of("hidden", true));
    }

    @PostMapping("/orders/{invoiceNumber}/cancel")
    public ApiResponse<PaymentOrderResponse> cancelOrder(@PathVariable String invoiceNumber) {
        return ApiResponse.ok(billingService.cancelOrder(invoiceNumber));
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<PaymentOrderResponse>> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(billingService.history(page, size));
    }
}
