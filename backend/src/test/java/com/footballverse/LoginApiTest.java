package com.footballverse;

import com.footballverse.auth.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "logging.level.org.springframework.security=TRACE",
    "logging.level.org.springframework.web=TRACE"
})
public class LoginApiTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testLoginApi() {
        LoginRequest request = new LoginRequest("admin@footballverse.local", "ChangeMe123!");
        ResponseEntity<String> response = restTemplate.postForEntity("/auth/login", request, String.class);
        
        System.out.println("Status: " + response.getStatusCode());
        System.out.println("Body: " + response.getBody());
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
