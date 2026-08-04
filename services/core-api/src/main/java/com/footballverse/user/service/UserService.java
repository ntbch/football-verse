package com.footballverse.user.service;
import com.footballverse.user.model.UserProfile;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.repository.UserProfileRepository;
import com.footballverse.user.repository.UserFollowTargetRepository;
import com.footballverse.user.repository.UserNotificationPreferencesRepository;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.dto.ProfileResponse;
import com.footballverse.user.dto.AccountExportResponse;
import com.footballverse.user.dto.FollowTargetResponse;
import com.footballverse.user.dto.NotificationPreferencesResponse;
import com.footballverse.user.model.UserRole;
import com.footballverse.user.model.UserStatus;
import com.footballverse.auth.repository.RefreshTokenRepository;
import com.footballverse.moderation.service.ModerationAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;


@Service
@RequiredArgsConstructor
public class UserService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final UserFollowTargetRepository followTargets;
    private final UserNotificationPreferencesRepository preferences;
    private final RefreshTokenRepository refreshTokens;
    private final CurrentUser currentUser;
    private final ModerationAuditService audit;

    @Transactional(readOnly = true)
    public ProfileResponse profile() {
        UserProfile profile = profiles.findByUserId(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
        return new ProfileResponse(profile.getDisplayName(), profile.getAvatarUrl(), profile.getBio());
    }

    @Transactional
    public ProfileResponse updateProfile(ProfileRequest request) {
        UserProfile profile = profiles.findByUserId(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
        if (request.displayName() != null) {
            profile.setDisplayName(request.displayName());
        }
        if (request.avatarUrl() != null) {
            validateAvatarUrl(request.avatarUrl());
            profile.setAvatarUrl(request.avatarUrl());
        }
        if (request.bio() != null) {
            profile.setBio(request.bio());
        }
        return new ProfileResponse(profile.getDisplayName(), profile.getAvatarUrl(), profile.getBio());
    }

    private void validateAvatarUrl(String value) {
        if (value.isBlank()) return;
        try {
            URI uri = URI.create(value.trim());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || host.isBlank() || uri.getUserInfo() != null
                    || "localhost".equalsIgnoreCase(host) || host.startsWith("127.") || host.startsWith("10.")
                    || host.startsWith("192.168.") || host.startsWith("169.254.")) {
                throw new IllegalArgumentException("Avatar URL must be a public HTTPS URL");
            }
        } catch (IllegalArgumentException exception) {
            throw new com.footballverse.common.exception.BadRequestException("Avatar URL must be a public HTTPS URL");
        }
    }

    @Transactional(readOnly = true)
    public AccountExportResponse exportAccount() {
        var user = currentUser.get();
        var profile = profiles.findByUserId(user.getId()).map(item -> new ProfileResponse(item.getDisplayName(), item.getAvatarUrl(), item.getBio())).orElse(null);
        var follows = followTargets.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(item -> new FollowTargetResponse(item.getTargetType(), item.getTargetKey(), item.getTargetName(), true, item.getCreatedAt()))
                .toList();
        var prefs = preferences.findByUserId(user.getId()).map(item -> new NotificationPreferencesResponse(item.isForumReplies(), item.isPredictionScored())).orElse(null);
        return new AccountExportResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus().name(), user.getCreatedAt(), profile, follows, prefs);
    }

    @Transactional
    public void deleteAccount() {
        var user = currentUser.get();
        audit.record("ACCOUNT_DELETED", "USER", user.getId(), "User requested account deletion; authored community content retained and anonymized");
        refreshTokens.revokeActiveByUserId(user.getId(), java.time.Instant.now());
        followTargets.deleteByUserId(user.getId());
        preferences.deleteByUserId(user.getId());
        profiles.findByUserId(user.getId()).ifPresent(profile -> {
            profile.setDisplayName("Deleted user");
            profile.setAvatarUrl(null);
            profile.setBio(null);
        });
        user.setEmail("deleted+" + user.getId() + "@deleted.footballverse.invalid");
        user.setUsername("deleted-user-" + user.getId());
        user.setPasswordHash(null);
        user.setGoogleId(null);
        user.setEmailVerified(false);
        user.setRoles(java.util.Set.of(UserRole.USER));
        user.setStatus(UserStatus.DELETED);
    }
}
