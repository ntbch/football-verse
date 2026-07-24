package com.footballverse.game.web;

import com.footballverse.game.career.CareerGameService;
import com.footballverse.game.career.CareerTacticsService;
import com.footballverse.game.dto.PlayerSnapshot;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/game/saves")
public class CareerSquadController {
    private final CareerGameService careers;
    private final CareerTacticsService tactics;

    public CareerSquadController(CareerGameService careers, CareerTacticsService tactics) {
        this.careers = careers;
        this.tactics = tactics;
    }

    @GetMapping("/{saveId}/clubs/{clubId}/squad")
    public List<PlayerSnapshot> squad(HttpServletRequest request, @PathVariable UUID saveId,
                                      @PathVariable UUID clubId) {
        return careers.squad(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/tactics")
    public CareerTacticsService.TacticalSetup tactics(HttpServletRequest request, @PathVariable UUID saveId) {
        return tactics.get(userId(request), saveId);
    }

    @PutMapping("/{saveId}/tactics")
    public CareerTacticsService.TacticalSetup saveTactics(HttpServletRequest request, @PathVariable UUID saveId,
                                                           @RequestBody CareerTacticsService.TacticalSetup setup) {
        return tactics.save(userId(request), saveId, setup);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/analysis")
    public List<CareerTacticsService.PlayerAnalysis> analysis(HttpServletRequest request, @PathVariable UUID saveId,
                                                               @PathVariable UUID clubId) {
        return tactics.analysis(userId(request), saveId, clubId);
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }
}
