package com.footballverse.prediction.controller.admin;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.prediction.service.FixtureService;
import com.footballverse.prediction.service.ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/fixtures")
@RequiredArgsConstructor
public class AdminFixtureController {

    private final FixtureRepository fixtureRepo;
    private final FixtureService fixtureService;
    private final ScoringService scoringService;

    @GetMapping
    public ApiResponse<PageResponse<Fixture>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String league,
            @RequestParam(required = false) String round,
            @RequestParam(required = false) Boolean scored
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.ok(PageResponse.from(fixtureRepo.findAdminFixtures(status, league, round, scored, pageable)));
    }

    @PostMapping("/sync")
    public ApiResponse<String> sync(
            @RequestParam(defaultValue = "premier-league") String league
    ) {
        fixtureService.syncFixtures(league);
        return ApiResponse.ok("Fixtures synced successfully for league: " + league);
    }

    @PostMapping("/{id}/score")
    public ApiResponse<String> score(@PathVariable Long id) {
        scoringService.scoreFixture(id);
        return ApiResponse.ok("Fixture scored successfully");
    }

    @PostMapping("/{id}/rescore")
    public ApiResponse<String> rescore(@PathVariable Long id) {
        scoringService.rescoreFixture(id);
        return ApiResponse.ok("Fixture rescored successfully");
    }
}
