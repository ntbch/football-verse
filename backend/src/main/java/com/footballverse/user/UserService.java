package com.footballverse.user;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.dto.ProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class UserService {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final CurrentUser currentUser;

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
            profile.setAvatarUrl(request.avatarUrl());
        }
        if (request.bio() != null) {
            profile.setBio(request.bio());
        }
        return new ProfileResponse(profile.getDisplayName(), profile.getAvatarUrl(), profile.getBio());
    }
}
