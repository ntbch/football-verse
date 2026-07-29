package com.footballverse.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionConfigurationValidatorTest {
    @Test
    void rejectsBootstrapCredentialsInProduction() {
        assertThrows(IllegalArgumentException.class,
                () -> new ProductionConfigurationValidator("production", false, "ChangeMe123!", ""));
    }

    @Test
    void permitsExplicitlyUnseededProduction() {
        assertDoesNotThrow(() -> new ProductionConfigurationValidator("production", false, "", ""));
    }
}
