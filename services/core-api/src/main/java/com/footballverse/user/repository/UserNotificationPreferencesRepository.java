package com.footballverse.user.repository;

import com.footballverse.user.model.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, Long> {
    Optional<UserNotificationPreferences> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
