package com.footballverse.user.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.forum.service.ForumThreadService;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.service.NewsArticleService;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.dto.ProfileResponse;
import com.footballverse.user.dto.FollowTargetRequest;
import com.footballverse.user.dto.FollowTargetResponse;
import com.footballverse.user.dto.FollowingFeedResponse;
import com.footballverse.user.dto.NotificationPreferencesRequest;
import com.footballverse.user.dto.NotificationPreferencesResponse;
import com.footballverse.user.dto.AccountExportResponse;
import com.footballverse.user.service.UserFollowTargetService;
import com.footballverse.user.service.NotificationPreferenceService;
import com.footballverse.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final ForumThreadService forumThreadService;
    private final NewsArticleService newsArticleService;
    private final UserFollowTargetService followTargetService;
    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping("/me/profile")
    public ApiResponse<ProfileResponse> profile() {
        return ApiResponse.ok(userService.profile());
    }

    @PatchMapping("/me/profile")
    public ApiResponse<ProfileResponse> updateProfile(@Valid @RequestBody ProfileRequest request) {
        return ApiResponse.ok(userService.updateProfile(request));
    }

    @GetMapping("/me/following-threads")
    public ApiResponse<List<ThreadResponse>> followingThreads() {
        return ApiResponse.ok(forumThreadService.followedThreads());
    }

    @GetMapping("/me/bookmarked-articles")
    public ApiResponse<List<NewsArticleResponse>> bookmarkedArticles() {
        return ApiResponse.ok(newsArticleService.bookmarked());
    }

    @GetMapping("/me/follows")
    public ApiResponse<List<FollowTargetResponse>> follows() {
        return ApiResponse.ok(followTargetService.follows());
    }

    @PutMapping("/me/follows")
    public ApiResponse<FollowTargetResponse> setFollow(@Valid @RequestBody FollowTargetRequest request) {
        return ApiResponse.ok(followTargetService.setFollow(request));
    }

    @GetMapping("/me/following-feed")
    public ApiResponse<FollowingFeedResponse> followingFeed(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "10") int limit
    ) {
        return ApiResponse.ok(followTargetService.feed(Math.min(Math.max(limit, 1), 20)));
    }

    @GetMapping("/me/notification-preferences")
    public ApiResponse<NotificationPreferencesResponse> notificationPreferences() {
        return ApiResponse.ok(notificationPreferenceService.mine());
    }

    @PatchMapping("/me/notification-preferences")
    public ApiResponse<NotificationPreferencesResponse> updateNotificationPreferences(
            @RequestBody NotificationPreferencesRequest request
    ) {
        return ApiResponse.ok(notificationPreferenceService.update(request));
    }

    @GetMapping("/me/export")
    public ApiResponse<AccountExportResponse> exportAccount() {
        return ApiResponse.ok(userService.exportAccount());
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteAccount() {
        userService.deleteAccount();
        return ApiResponse.ok("Account deleted. Community content is retained in anonymized form.", null);
    }
}
