package com.footballverse.game.web;

import com.footballverse.game.career.CareerMutationLedgerService;
import com.footballverse.game.career.ManagerService;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/game/saves")
public class CareerManagerController {
    private final ManagerService managers;
    private final CareerMutationLedgerService ledger;

    public CareerManagerController(ManagerService managers, CareerMutationLedgerService ledger) {
        this.managers = managers;
        this.ledger = ledger;
    }

    @GetMapping("/{saveId}/manager")
    public ManagerService.Dashboard manager(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.dashboard(userId(request), saveId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/manager")
    public ManagerService.Dashboard clubManager(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId) {
        return managers.clubManager(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/manager/decisions")
    public List<Map<String, Object>> managerDecisions(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.decisions(userId(request), saveId);
    }

    @GetMapping("/{saveId}/jobs")
    public List<Map<String, Object>> jobs(HttpServletRequest request, @PathVariable UUID saveId) {
        return managers.jobs(userId(request), saveId);
    }

    @PostMapping("/{saveId}/jobs/{clubId}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acceptJob(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                          @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        ledger.execute(owner, saveId, requestId, "ACCEPT_JOB", String.class, () -> {
            managers.acceptJob(owner, saveId, clubId);
            return "OK";
        });
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }
}
