package com.footballverse.user.admin;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.moderation.service.ModerationAuditService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserRole;
import com.footballverse.user.model.UserStatus;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.admin.AdminUserResponse;
import com.footballverse.user.admin.dto.UpdateUserRoleRequest;
import com.footballverse.user.admin.dto.UpdateUserStatusRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private final UserAccountRepository users;
    private final CurrentUser currentUser;
    private final ModerationAuditService audit;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> adminUsers(int page, int size, String search, UserRole role) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        var result = users.searchAdminUsers(search == null ? "" : search.trim(), role, pageable).map(this::toAdminUser);
        return PageResponse.from(result);
    }

    @Transactional
    public AdminUserResponse updateStatus(Long id, UpdateUserStatusRequest request) {
        UserAccount user = targetForMutation(id);
        if (user.getRoles().contains(UserRole.ADMIN) && request.status() != UserStatus.ACTIVE
                && users.findByRoleAndStatusForUpdate(UserRole.ADMIN, UserStatus.ACTIVE).size() <= 1) {
            throw new BadRequestException("The last active admin cannot be suspended");
        }
        user.setStatus(request.status());
        audit.record("USER_STATUS_UPDATED", "USER", id, request.reason());
        return toAdminUser(user);
    }

    @Transactional
    public AdminUserResponse updateRoles(Long id, UpdateUserRoleRequest request) {
        UserAccount user = targetForMutation(id);
        if (user.getRoles().contains(UserRole.ADMIN)
                && !request.roles().contains(UserRole.ADMIN)
                && users.findByRoleAndStatusForUpdate(UserRole.ADMIN, UserStatus.ACTIVE).size() <= 1) {
            throw new BadRequestException("The last active admin cannot be demoted");
        }
        user.setRoles(request.roles());
        audit.record("USER_ROLES_UPDATED", "USER", id, request.reason());
        return toAdminUser(user);
    }

    private UserAccount targetForMutation(Long id) {
        UserAccount actor = currentUser.get();
        if (actor.getId().equals(id)) {
            throw new BadRequestException("An admin cannot mutate their own account");
        }
        return users.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private AdminUserResponse toAdminUser(UserAccount user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles(), user.getCreatedAt());
    }
}
