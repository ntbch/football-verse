package com.footballverse.user.service;

import com.footballverse.notification.model.NotificationType;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.NotificationPreferencesRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserNotificationPreferencesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {
    @Mock private UserNotificationPreferencesRepository preferences;
    @Mock private CurrentUser currentUser;
    @Mock private UserAccount user;

    private NotificationPreferenceService service;

    @BeforeEach
    void setUp() {
        service = new NotificationPreferenceService(preferences, currentUser);
        when(currentUser.get()).thenReturn(user);
        when(user.getId()).thenReturn(9L);
    }

    @Test
    void disablesOnlyTheRequestedNotificationType() {
        when(preferences.findByUserId(9L)).thenReturn(Optional.empty());
        when(preferences.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.update(new NotificationPreferencesRequest(null, false));

        assertThat(response.forumReplies()).isTrue();
        assertThat(response.predictionScored()).isFalse();
        var stored = org.mockito.ArgumentCaptor.forClass(com.footballverse.user.model.UserNotificationPreferences.class);
        org.mockito.Mockito.verify(preferences).save(stored.capture());
        when(preferences.findByUserId(9L)).thenReturn(Optional.of(stored.getValue()));
        assertThat(service.allows(user, NotificationType.PREDICTION_SCORED)).isFalse();
        assertThat(service.allows(user, NotificationType.FORUM_REPLY)).isTrue();
    }
}
