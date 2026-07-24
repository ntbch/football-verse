package com.footballverse.user.admin;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import com.footballverse.user.admin.AdminUserResponse;
import com.footballverse.user.admin.dto.UpdateUserRoleRequest;
import com.footballverse.user.admin.dto.UpdateUserStatusRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private final UserAccountRepository users;

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

    @Transactional
    public AdminUserResponse updateRoles(Long id, UpdateUserRoleRequest request) {
        UserAccount user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setRoles(request.roles());
        return toAdminUser(user);
    }

    private AdminUserResponse toAdminUser(UserAccount user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getStatus(), user.getRoles());
    }
}
