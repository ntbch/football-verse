package com.footballverse.notification.service;
import com.footballverse.notification.model.Notification;
import com.footballverse.notification.model.NotificationCreatedEvent;
import com.footballverse.notification.model.NotificationType;
import com.footballverse.notification.repository.NotificationRepository;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.security.CurrentUser;
import com.footballverse.notification.dto.NotificationResponse;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;
    private final CurrentUser currentUser;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void create(UserAccount user, NotificationType type, String message, String linkUrl) {
        Notification notification = notifications.save(new Notification(user, type, message, linkUrl));
        eventPublisher.publishEvent(new NotificationCreatedEvent(this, notification));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine() {
        return notifications.findByUserOrderByCreatedAtDesc(currentUser.get()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public NotificationResponse read(Long id) {
        Notification notification = notifications.findByIdAndUser(id, currentUser.get())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setReadAt(Instant.now());
        return toResponse(notification);
    }

    @Transactional
    public void readAll() {
        notifications.findByUserOrderByCreatedAtDesc(currentUser.get()).forEach(notification -> notification.setReadAt(Instant.now()));
    }

    @Transactional
    public void delete(Long id) {
        Notification notification = notifications.findByIdAndUser(id, currentUser.get())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notifications.delete(notification);
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getLinkUrl(),
                notification.getReadAt() != null,
                notification.getCreatedAt()
        );
    }
}
