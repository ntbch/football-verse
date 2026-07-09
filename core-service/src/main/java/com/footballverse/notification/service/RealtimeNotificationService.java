package com.footballverse.notification.service;
import com.footballverse.notification.model.Notification;
import com.footballverse.notification.model.NotificationCreatedEvent;

import com.footballverse.notification.dto.NotificationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class RealtimeNotificationService {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @org.springframework.beans.factory.annotation.Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
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
    }
}
