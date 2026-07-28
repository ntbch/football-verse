package com.footballverse.auth.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballverse.user.model.UserRole;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;

class AuthResponseTest {
    @Test
    void refreshTokenNeverAppearsInAuthJson() throws Exception {
        String json = new ObjectMapper().writeValueAsString(new AuthResponse(
                "access-token", "refresh-token", 1L, "user@example.com", "user", Set.of(UserRole.USER)
        ));

        assertFalse(json.contains("refresh-token"));
    }
}
