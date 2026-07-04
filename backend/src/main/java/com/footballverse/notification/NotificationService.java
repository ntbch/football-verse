package com.footballverse.notification;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.security.CurrentUser;
import com.footballverse.notification.dto.NotificationResponse;
import com.footballverse.user.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;
    private final CurrentUser currentUser;

    @Transactional
    public void create(UserAccount user, NotificationType type, String message, String linkUrl) {
        notifications.save(new Notification(user, type, message, linkUrl));
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
