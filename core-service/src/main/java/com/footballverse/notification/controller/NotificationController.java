package com.footballverse.notification.controller;
import com.footballverse.notification.service.NotificationService;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> mine() {
        return ApiResponse.ok(notificationService.mine());
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<NotificationResponse> read(@PathVariable Long id) {
        return ApiResponse.ok(notificationService.read(id));
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> readAll() {
        notificationService.readAll();
        return ApiResponse.ok(null);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        notificationService.delete(id);
        return ApiResponse.ok(null);
    }
}
