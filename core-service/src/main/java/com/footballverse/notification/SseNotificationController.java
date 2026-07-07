package com.footballverse.notification;

import com.footballverse.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class SseNotificationController {
    private final SseNotificationService sseNotificationService;
    private final JwtService jwtService;

    @GetMapping(value = "/api/v1/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamNotifications(@RequestParam("token") String token) {
        if (token == null || token.isBlank() || !jwtService.isValid(token)) {
            return ResponseEntity.status(401).build();
        }

        Long userId = jwtService.userId(token);
        SseEmitter emitter = sseNotificationService.register(userId);
        return ResponseEntity.ok(emitter);
    }
}
