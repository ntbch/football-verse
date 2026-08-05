package com.footballverse.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ProductionConfigurationValidator {
    public ProductionConfigurationValidator(String environment, boolean seedEnabled, String adminPassword, String moderatorPassword) {
        validate(environment, seedEnabled, adminPassword, moderatorPassword, "", "", "", "", false, "", false);
    }

    @Autowired
    public ProductionConfigurationValidator(
            @Value("${app.environment:development}") String environment,
            @Value("${app.seed.enabled:false}") boolean seedEnabled,
            @Value("${app.seed.admin-password:}") String adminPassword,
            @Value("${app.seed.moderator-password:}") String moderatorPassword,
            @Value("${app.auth.public-url:http://localhost:3000}") String publicUrl,
            @Value("${app.cors-origin:http://localhost:3000}") String corsOrigin,
            @Value("${app.internal.token:}") String internalToken,
            @Value("${app.jwt.secret:}") String jwtSecret,
            @Value("${app.auth.refresh-cookie.secure:true}") boolean cookieSecure,
            @Value("${spring.datasource.url:}") String datasourceUrl,
            @Value("${app.billing.enabled:false}") boolean billingEnabled,
            @Value("${app.billing.sales-enabled:false}") boolean billingSalesEnabled,
            @Value("${app.billing.sepay.environment:sandbox}") String sepayEnvironment,
            @Value("${app.billing.sepay.merchant-id:}") String sepayMerchantId,
            @Value("${app.billing.sepay.secret-key:}") String sepaySecretKey,
            @Value("${app.billing.sepay.ipn-secret:}") String sepayIpnSecret,
             @Value("${app.billing.premium-1-month-price-vnd:0}") long premium1MonthPrice,
             @Value("${app.billing.premium-3-month-price-vnd:0}") long premium3MonthPrice,
             @Value("${app.billing.premium-6-month-price-vnd:0}") long premium6MonthPrice,
             @Value("${app.billing.premium-12-month-price-vnd:0}") long premium12MonthPrice,
             @Value("${app.billing.sepay.checkout-url:https://pay-sandbox.sepay.vn/v1/checkout/init}") String sepayCheckoutUrl
    ) {
        validate(environment, seedEnabled, adminPassword, moderatorPassword, publicUrl, corsOrigin, internalToken, jwtSecret, cookieSecure, datasourceUrl, true);
        validateBilling(environment, billingEnabled, billingSalesEnabled, sepayEnvironment, sepayMerchantId,
                sepaySecretKey, sepayIpnSecret, premium1MonthPrice, premium3MonthPrice,
                premium6MonthPrice, premium12MonthPrice, sepayCheckoutUrl);
    }

    private static void validate(
            String environment,
            boolean seedEnabled,
            String adminPassword,
            String moderatorPassword,
            String publicUrl,
            String corsOrigin,
            String internalToken,
            String jwtSecret,
            boolean cookieSecure,
            String datasourceUrl,
            boolean enforceRuntimeSafety
    ) {
        if (!"production".equalsIgnoreCase(environment)) return;
        if (seedEnabled || "ChangeMe123!".equals(adminPassword) || "ChangeMe123!".equals(moderatorPassword)) {
            throw new IllegalArgumentException("Production forbids bootstrap users and default credentials");
        }
        if (!enforceRuntimeSafety) return;
        if (!publicUrl.startsWith("https://") || publicUrl.matches("(?i).*://(localhost|127\\.0\\.0\\.1)(:|/|$).*")) {
            throw new IllegalArgumentException("APP_PUBLIC_URL must be a public HTTPS URL in production");
        }
        if (!corsOrigin.startsWith("https://")) throw new IllegalArgumentException("CORS_ORIGIN must use HTTPS in production");
        if (internalToken.length() < 24 || internalToken.contains("change-me")) throw new IllegalArgumentException("INTERNAL_TOKEN is unsafe in production");
        if (jwtSecret.length() < 32 || jwtSecret.contains("dev-secret")) throw new IllegalArgumentException("JWT_SECRET is unsafe in production");
        if (!cookieSecure) throw new IllegalArgumentException("Refresh cookies must be Secure in production");
        if (datasourceUrl.matches("(?i).*://(localhost|127\\.0\\.0\\.1)(:|/|$).*")) throw new IllegalArgumentException("Production database cannot use localhost");
    }

    private static void validateBilling(
            String environment,
            boolean billingEnabled,
            boolean salesEnabled,
            String sepayEnvironment,
            String merchantId,
            String secretKey,
            String ipnSecret,
            long premium1MonthPrice,
            long premium3MonthPrice,
            long premium6MonthPrice,
            long premium12MonthPrice,
            String checkoutUrl
    ) {
        if (!"production".equalsIgnoreCase(environment)) return;
        if (salesEnabled && !billingEnabled) throw new IllegalArgumentException("Billing sales cannot be enabled while Billing is disabled");
        if (!billingEnabled) return;
        if (!("sandbox".equalsIgnoreCase(sepayEnvironment) || "production".equalsIgnoreCase(sepayEnvironment))) {
            throw new IllegalArgumentException("SEPAY_ENV must be sandbox or production");
        }
        if (salesEnabled && (merchantId.isBlank() || secretKey.isBlank() || ipnSecret.isBlank())) {
            throw new IllegalArgumentException("Production Billing sales require SePay credentials");
        }
        if (salesEnabled && (premium1MonthPrice <= 0 || premium3MonthPrice <= 0
                || premium6MonthPrice <= 0 || premium12MonthPrice <= 0)) {
            throw new IllegalArgumentException("Production Billing sales require positive Premium prices");
        }
        if (salesEnabled && (!checkoutUrl.startsWith("https://") || !checkoutUrl.contains("sepay.vn"))) {
            throw new IllegalArgumentException("Production SePay checkout URL must be an HTTPS SePay URL");
        }
    }
}
