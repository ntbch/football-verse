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
            @Value("${spring.datasource.url:}") String datasourceUrl
    ) {
        validate(environment, seedEnabled, adminPassword, moderatorPassword, publicUrl, corsOrigin, internalToken, jwtSecret, cookieSecure, datasourceUrl, true);
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
}
