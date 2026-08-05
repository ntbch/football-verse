package com.footballverse.billing.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
public class BillingProperties {
    private final boolean enabled;
    private final boolean salesEnabled;
    private final String sepayEnvironment;
    private final String merchantId;
    private final String secretKey;
    private final String ipnSecret;
    private final String checkoutUrl;
    private final String apiUrl;
    private final String bankHubApiKey;
    private final String qrBankCode;
    private final String qrAccountNumber;
    private final String qrAccountName;
    private final String qrTemplate;
    private final String publicUrl;
    private final long premium1MonthPriceVnd;
    private final long premium3MonthPriceVnd;
    private final long premium6MonthPriceVnd;
    private final long premium12MonthPriceVnd;

    public BillingProperties(
            @Value("${app.billing.enabled:false}") boolean enabled,
            @Value("${app.billing.sales-enabled:false}") boolean salesEnabled,
            @Value("${app.billing.sepay.environment:sandbox}") String sepayEnvironment,
            @Value("${app.billing.sepay.merchant-id:}") String merchantId,
            @Value("${app.billing.sepay.secret-key:}") String secretKey,
            @Value("${app.billing.sepay.ipn-secret:}") String ipnSecret,
            @Value("${app.billing.sepay.checkout-url:https://pay-sandbox.sepay.vn/v1/checkout/init}") String checkoutUrl,
            @Value("${app.billing.sepay.api-url:https://pgapi-sandbox.sepay.vn}") String apiUrl,
            @Value("${app.billing.sepay.bankhub-api-key:}") String bankHubApiKey,
            @Value("${app.billing.sepay.qr.bank-code:}") String qrBankCode,
            @Value("${app.billing.sepay.qr.account-number:}") String qrAccountNumber,
            @Value("${app.billing.sepay.qr.account-name:}") String qrAccountName,
            @Value("${app.billing.sepay.qr.template:compact}") String qrTemplate,
            @Value("${app.auth.public-url:http://localhost:3000}") String publicUrl,
            @Value("${app.billing.premium-1-month-price-vnd:49000}") long premium1MonthPriceVnd,
            @Value("${app.billing.premium-3-month-price-vnd:129000}") long premium3MonthPriceVnd,
            @Value("${app.billing.premium-6-month-price-vnd:219000}") long premium6MonthPriceVnd,
            @Value("${app.billing.premium-12-month-price-vnd:349000}") long premium12MonthPriceVnd
    ) {
        this.enabled = enabled;
        this.salesEnabled = salesEnabled;
        this.sepayEnvironment = sepayEnvironment;
        this.merchantId = merchantId == null ? "" : merchantId.trim();
        this.secretKey = secretKey == null ? "" : secretKey;
        this.ipnSecret = ipnSecret == null ? "" : ipnSecret;
        this.checkoutUrl = checkoutUrl;
        this.apiUrl = apiUrl;
        this.bankHubApiKey = bankHubApiKey == null ? "" : bankHubApiKey.trim();
        this.qrBankCode = qrBankCode == null ? "" : qrBankCode.trim();
        this.qrAccountNumber = qrAccountNumber == null ? "" : qrAccountNumber.trim();
        this.qrAccountName = qrAccountName == null ? "" : qrAccountName.trim();
        this.qrTemplate = qrTemplate == null || qrTemplate.isBlank() ? "compact" : qrTemplate.trim();
        this.publicUrl = publicUrl.replaceAll("/$", "");
        this.premium1MonthPriceVnd = premium1MonthPriceVnd;
        this.premium3MonthPriceVnd = premium3MonthPriceVnd;
        this.premium6MonthPriceVnd = premium6MonthPriceVnd;
        this.premium12MonthPriceVnd = premium12MonthPriceVnd;
    }

    public boolean isReadyForSales() {
        boolean checkoutReady = !merchantId.isBlank() && !secretKey.isBlank() && !ipnSecret.isBlank();
        return enabled && salesEnabled && allPlanPricesPositive() && (checkoutReady || isBankHubReady());
    }

    public boolean isReadyForProviderApi() {
        return enabled && !merchantId.isBlank() && !secretKey.isBlank() && !apiUrl.isBlank();
    }

    public boolean isQrReady() {
        return enabled && salesEnabled && qrBankCode.matches("[A-Za-z0-9_-]{2,32}")
                && qrAccountNumber.matches("\\d{6,24}") && !qrAccountName.isBlank()
                && qrTemplate.matches("[a-z0-9_-]{1,32}");
    }

    public boolean isBankHubReady() {
        return isQrReady() && !bankHubApiKey.isBlank();
    }

    private boolean allPlanPricesPositive() {
        return premium1MonthPriceVnd > 0 && premium3MonthPriceVnd > 0
                && premium6MonthPriceVnd > 0 && premium12MonthPriceVnd > 0;
    }
}
