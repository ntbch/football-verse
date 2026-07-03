package com.footballverse.user;

import com.footballverse.admin.dto.AdminUserResponse;
import com.footballverse.admin.dto.UpdateUserStatusRequest;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.security.CurrentUser;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.dto.ProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    @Transactional(readOnly = true)
    public List<AdminUserResponse> adminUsers() {
        return users.findAll().stream().map(this::toAdminUser).toList();
    }

    @Transactional
    public AdminUserResponse updateStatus(Long id, UpdateUserStatusRequest request) {
        UserAccount user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus(request.status());
        return toAdminUser(user);
    }

    private AdminUserResponse toAdminUser(UserAccount user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles());
    }
}
