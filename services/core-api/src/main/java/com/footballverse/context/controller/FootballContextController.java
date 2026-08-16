package com.footballverse.context.controller;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.context.dto.FixtureContextResponse;
import com.footballverse.context.service.FootballContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/contexts")
@RequiredArgsConstructor
public class FootballContextController {
    private final FootballContextService contexts;

    @GetMapping("/fixtures/{fixtureId}")
    public ApiResponse<FixtureContextResponse> fixture(@PathVariable String fixtureId) {
        return ApiResponse.ok(contexts.fixtureContext(fixtureId));
    }
}
