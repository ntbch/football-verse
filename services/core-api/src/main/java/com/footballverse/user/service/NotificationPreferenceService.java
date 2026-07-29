package com.footballverse.user.service;

import com.footballverse.notification.model.NotificationType;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.NotificationPreferencesRequest;
import com.footballverse.user.dto.NotificationPreferencesResponse;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserNotificationPreferences;
import com.footballverse.user.repository.UserNotificationPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {
    private final UserNotificationPreferencesRepository preferences;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse mine() {
        UserAccount user = currentUser.get();
        return response(preferences.findByUserId(user.getId()).orElseGet(() -> new UserNotificationPreferences(user)));
    }

    @Transactional
    public NotificationPreferencesResponse update(NotificationPreferencesRequest request) {
        UserAccount user = currentUser.get();
        UserNotificationPreferences preference = preferences.findByUserId(user.getId())
                .orElseGet(() -> new UserNotificationPreferences(user));
        if (request.forumReplies() != null) preference.setForumReplies(request.forumReplies());
        if (request.predictionScored() != null) preference.setPredictionScored(request.predictionScored());
        return response(preferences.save(preference));
    }

    @Transactional(readOnly = true)
    public boolean allows(UserAccount user, NotificationType type) {
        UserNotificationPreferences preference = preferences.findByUserId(user.getId()).orElse(null);
        if (preference == null) return true;
        return switch (type) {
            case FORUM_REPLY -> preference.isForumReplies();
            case PREDICTION_SCORED -> preference.isPredictionScored();
            default -> true;
        };
    }

    private NotificationPreferencesResponse response(UserNotificationPreferences preference) {
        return new NotificationPreferencesResponse(preference.isForumReplies(), preference.isPredictionScored());
    }
}
