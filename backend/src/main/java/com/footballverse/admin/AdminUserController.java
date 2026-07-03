package com.footballverse.admin;

import com.footballverse.admin.dto.AdminUserResponse;
import com.footballverse.admin.dto.UpdateUserStatusRequest;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.user.UserService;
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
    private final UserService userService;

    @GetMapping
    public ApiResponse<List<AdminUserResponse>> users() {
        return ApiResponse.ok(userService.adminUsers());
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserResponse> status(@PathVariable Long id, @Valid @RequestBody UpdateUserStatusRequest request) {
        return ApiResponse.ok(userService.updateStatus(id, request));
    }
}
