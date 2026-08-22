package com.footballverse.minigame.controller;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.response.ApiResponse;
import com.footballverse.minigame.dto.MinigameDtos;
import com.footballverse.minigame.model.MinigameType;
import com.footballverse.minigame.service.DailyMinigameService;
import com.footballverse.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/minigames")
@RequiredArgsConstructor
public class MinigameController {
    private static final String GUEST_COOKIE_NAME = "fv-minigame-guest";
    private final DailyMinigameService games;
    private final CurrentUser currentUser;

    @PostMapping("/guest-session")
    public ApiResponse<Void> createGuestSession(HttpServletResponse response) {
        String token = UUID.randomUUID().toString();
        Cookie cookie = new Cookie(GUEST_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        // Requests reach this API through the gateway under /api/v1/minigames/**;
        // the cookie path must cover that prefix or the browser will never send it.
        cookie.setPath("/api/v1/minigames");
        cookie.setMaxAge(86400);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
        return ApiResponse.ok(null);
    }

    @GetMapping("/daily")
    public ApiResponse<MinigameDtos.DailyResponse> daily(@CookieValue(value = GUEST_COOKIE_NAME, required = false) String guestToken) {
        return ApiResponse.ok(games.daily(currentUser.getOrNull(), guestToken));
    }

    @PostMapping("/daily/{game}/attempt")
    public ApiResponse<MinigameDtos.AttemptResponse> start(@PathVariable String game,
                                                             @RequestParam(defaultValue = "false") boolean practice,
                                                             @CookieValue(value = GUEST_COOKIE_NAME, required = false) String guestToken) {
        return ApiResponse.ok(games.start(currentUser.getOrNull(), guestToken, gameType(game), practice));
    }

    @GetMapping("/players")
    public ApiResponse<List<MinigameDtos.PlayerOption>> players(@RequestParam String q) {
        return ApiResponse.ok(games.searchPlayers(q));
    }

    @PostMapping("/attempts/{attemptId}/guess")
    public ApiResponse<MinigameDtos.AttemptResponse> guess(@PathVariable Long attemptId,
                                                             @Valid @RequestBody MinigameDtos.GuessRequest request,
                                                             @CookieValue(value = GUEST_COOKIE_NAME, required = false) String guestToken) {
        return ApiResponse.ok(games.guess(currentUser.getOrNull(), guestToken, attemptId, request));
    }

    @PostMapping("/attempts/{attemptId}/reveal")
    public ApiResponse<MinigameDtos.AttemptResponse> reveal(@PathVariable Long attemptId,
                                                              @Valid @RequestBody MinigameDtos.VersionRequest request,
                                                              @CookieValue(value = GUEST_COOKIE_NAME, required = false) String guestToken) {
        return ApiResponse.ok(games.reveal(currentUser.getOrNull(), guestToken, attemptId, request.version()));
    }

    @PostMapping("/claim")
    public ApiResponse<Void> claim(@CookieValue(value = GUEST_COOKIE_NAME, required = false) String guestToken) {
        games.claim(currentUser.get(), guestToken);
        return ApiResponse.ok(null);
    }

    @GetMapping("/leaderboard")
    public ApiResponse<MinigameDtos.LeaderboardResponse> leaderboard(@RequestParam(defaultValue = "combined") String scope) {
        return ApiResponse.ok(games.leaderboard(scope, currentUser.getOrNull()));
    }

    private MinigameType gameType(String value) {
        return switch (value.toLowerCase(java.util.Locale.ROOT)) {
            case "who-am-i" -> MinigameType.WHO_AM_I;
            case "grid" -> MinigameType.GRID;
            default -> throw new BadRequestException("Unsupported game.");
        };
    }
}
