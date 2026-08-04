package com.footballverse.user.controller.admin;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.user.admin.AdminUserResponse;
import com.footballverse.user.admin.AdminUserService;
import com.footballverse.user.admin.dto.UpdateUserRoleRequest;
import com.footballverse.user.admin.dto.UpdateUserStatusRequest;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.user.model.UserRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<PageResponse<AdminUserResponse>> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) UserRole role
    ) {
        return ApiResponse.ok(adminUserService.adminUsers(page, size, search, role));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserResponse> status(@PathVariable Long id, @Valid @RequestBody UpdateUserStatusRequest request) {
        return ApiResponse.ok(adminUserService.updateStatus(id, request));
    }

    @PatchMapping("/{id}/roles")
    public ApiResponse<AdminUserResponse> roles(@PathVariable Long id, @Valid @RequestBody UpdateUserRoleRequest request) {
        return ApiResponse.ok(adminUserService.updateRoles(id, request));
    }
}
