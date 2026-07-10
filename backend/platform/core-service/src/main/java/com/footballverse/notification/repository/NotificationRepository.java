package com.footballverse.notification.repository;
import com.footballverse.notification.model.Notification;

import com.footballverse.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(UserAccount user);

    Optional<Notification> findByIdAndUser(Long id, UserAccount user);
}
