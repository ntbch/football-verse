package com.footballverse.billing.controller.admin;

import com.footballverse.billing.dto.ReconciliationResponse;
import com.footballverse.billing.service.BillingService;
import com.footballverse.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/billing")
@RequiredArgsConstructor
public class AdminBillingController {
    private final BillingService billingService;

    @GetMapping("/orders/{invoiceNumber}/reconcile")
    public ApiResponse<ReconciliationResponse> reconcile(@PathVariable String invoiceNumber) {
        return ApiResponse.ok(billingService.reconcile(invoiceNumber));
    }
}
