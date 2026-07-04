package com.footballverse.user;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.forum.ForumService;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.user.dto.ProfileRequest;
import com.footballverse.user.dto.ProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final ForumService forumService;

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
        return ApiResponse.ok(forumService.followedThreads());
    }
}
