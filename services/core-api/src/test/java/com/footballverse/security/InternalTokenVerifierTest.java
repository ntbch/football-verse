package com.footballverse.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InternalTokenVerifierTest {
    @Test
    void acceptsOnlyExactServiceCredential() {
        InternalTokenVerifier verifier = new InternalTokenVerifier("internal-test-token-with-24-characters");

        assertThat(verifier.matches("internal-test-token-with-24-characters")).isTrue();
        assertThat(verifier.matches("internal-test-token-with-24-characterX")).isFalse();
        assertThat(verifier.matches(null)).isFalse();
    }

    @Test
    void rejectsWeakServiceCredential() {
        assertThatThrownBy(() -> new InternalTokenVerifier("short"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
