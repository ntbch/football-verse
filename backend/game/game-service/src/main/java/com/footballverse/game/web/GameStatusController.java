package com.footballverse.game.web;

import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class GameStatusController {
    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok", "service", "game-service");
    }

    @GetMapping("/game/status")
    Map<String, Object> status(HttpServletRequest request) {
        return Map.of("status", "ok", "userId", request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE));
    }
}
