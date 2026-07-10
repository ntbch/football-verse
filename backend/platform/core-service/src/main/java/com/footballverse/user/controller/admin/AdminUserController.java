package com.footballverse.user.controller.admin;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.user.admin.AdminUserResponse;
import com.footballverse.user.admin.AdminUserService;
import com.footballverse.user.admin.dto.UpdateUserStatusRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<List<AdminUserResponse>> users() {
        return ApiResponse.ok(adminUserService.adminUsers());
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserResponse> status(@PathVariable Long id, @Valid @RequestBody UpdateUserStatusRequest request) {
        return ApiResponse.ok(adminUserService.updateStatus(id, request));
    }
}
