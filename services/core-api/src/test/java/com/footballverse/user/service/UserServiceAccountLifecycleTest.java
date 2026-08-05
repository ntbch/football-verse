package com.footballverse.user.service;

import com.footballverse.auth.repository.RefreshTokenRepository;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.moderation.service.ModerationAuditService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.model.UserStatus;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.repository.UserFollowTargetRepository;
import com.footballverse.user.repository.UserNotificationPreferencesRepository;
import com.footballverse.user.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceAccountLifecycleTest {
    @Mock private UserAccountRepository users;
    @Mock private UserProfileRepository profiles;
    @Mock private UserFollowTargetRepository followTargets;
    @Mock private UserNotificationPreferencesRepository preferences;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private CurrentUser currentUser;
    @Mock private ModerationAuditService audit;
    private UserAccount user;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(users, profiles, followTargets, preferences, refreshTokens, currentUser, audit);
        user = new UserAccount("alice@example.com", "alice", "hash");
        user.setId(42L);
        when(currentUser.get()).thenReturn(user);
    }

    @Test
    void deleteAccountRevokesSessionsAndAnonymizesRetainedContentOwner() {
        var profile = new UserProfile(user, "Alice");
        profile.setAvatarUrl("https://cdn.example/avatar.png");
        profile.setBio("bio");
        when(profiles.findByUserId(42L)).thenReturn(Optional.of(profile));

        service.deleteAccount();

        verify(audit).record("ACCOUNT_DELETED", "USER", 42L,
                "User requested account deletion; authored community content retained and anonymized");
        verify(refreshTokens).revokeActiveByUserId(org.mockito.ArgumentMatchers.eq(42L), org.mockito.ArgumentMatchers.any());
        verify(followTargets).deleteByUserId(42L);
        verify(preferences).deleteByUserId(42L);
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(user.getUsername()).isEqualTo("deleted-user-42");
        assertThat(user.getEmail()).isEqualTo("deleted+42@deleted.footballverse.invalid");
        assertThat(profile.getDisplayName()).isEqualTo("Deleted user");
        assertThat(profile.getAvatarUrl()).isNull();
        assertThat(profile.getBio()).isNull();
    }

    @Test
    void profileUpdateRejectsPrivateAvatarUrls() {
        when(profiles.findByUserId(42L)).thenReturn(Optional.of(new UserProfile(user, "Alice")));

        assertThatThrownBy(() -> service.updateProfile(new ProfileRequest(null, "http://127.0.0.1/avatar.png", null)))
                .isInstanceOf(BadRequestException.class);
    }
}
