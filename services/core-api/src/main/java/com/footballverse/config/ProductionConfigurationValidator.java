package com.footballverse.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ProductionConfigurationValidator {
    public ProductionConfigurationValidator(
            @Value("${app.environment:development}") String environment,
            @Value("${app.seed.enabled:false}") boolean seedEnabled,
            @Value("${app.seed.admin-password:}") String adminPassword,
            @Value("${app.seed.moderator-password:}") String moderatorPassword
    ) {
        if ("production".equalsIgnoreCase(environment)
                && (seedEnabled || "ChangeMe123!".equals(adminPassword) || "ChangeMe123!".equals(moderatorPassword))) {
            throw new IllegalArgumentException("Production forbids bootstrap users and default credentials");
        }
    }
}
