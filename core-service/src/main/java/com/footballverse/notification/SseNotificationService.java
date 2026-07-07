package com.footballverse.notification;

import com.footballverse.notification.dto.NotificationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseNotificationService {
    // Keep timeout at 30 minutes (1800000 ms)
    private static final long TIMEOUT = 1800000L;
    
    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @org.springframework.beans.factory.annotation.Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public SseEmitter register(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        
        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("Registered SSE emitter for user {}", userId);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((ex) -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("init").data("Connected"));
        } catch (IOException e) {
            log.error("Failed to send init event to user {}", userId, e);
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();
        Long userId = notification.getUser().getId();

        NotificationResponse response = new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getLinkUrl(),
                notification.getReadAt() != null,
                notification.getCreatedAt()
        );

        if (redisTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(response);
                redisTemplate.convertAndSend("realtime:notifications:" + userId, json);
                log.info("Published real-time notification to Redis for user {}", userId);
            } catch (Exception e) {
                log.error("Failed to publish notification to Redis for user {}", userId, e);
            }
        }

        List<SseEmitter> emitters = userEmitters.get(userId);
        
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(response));
                log.info("Pushed real-time notification to user {}", userId);
            } catch (IOException | IllegalStateException e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        userEmitters.forEach((userId, emitters) -> {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
                } catch (IOException | IllegalStateException e) {
                    deadEmitters.add(emitter);
                }
            }
            if (!deadEmitters.isEmpty()) {
                emitters.removeAll(deadEmitters);
            }
        });
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
        log.info("Removed SSE emitter for user {}", userId);
    }
}
