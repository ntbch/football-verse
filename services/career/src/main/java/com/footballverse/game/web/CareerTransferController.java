package com.footballverse.game.web;

import com.footballverse.game.career.CareerMutationLedgerService;
import com.footballverse.game.career.PageResult;
import com.footballverse.game.career.TransferMarketService;
import com.footballverse.game.security.InternalGatewayFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/game/saves")
public class CareerTransferController {
    private final TransferMarketService transfers;
    private final CareerMutationLedgerService ledger;

    public CareerTransferController(TransferMarketService transfers, CareerMutationLedgerService ledger) {
        this.transfers = transfers;
        this.ledger = ledger;
    }

    @GetMapping("/{saveId}/clubs/{clubId}/market")
    public TransferMarketService.TransferMarket market(HttpServletRequest request, @PathVariable UUID saveId,
                                                        @PathVariable UUID clubId) {
        return transfers.market(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/market/paged")
    public TransferMarketService.MarketPage marketPage(
        HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "") String q
    ) {
        return transfers.marketPage(userId(request), saveId, clubId, page, size, q);
    }

    @PostMapping("/{saveId}/clubs/{clubId}/scouting/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void scout(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId, @PathVariable UUID playerId) {
        transfers.scout(userId(request), saveId, clubId, playerId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/offers")
    public List<TransferMarketService.Offer> offers(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId) {
        return transfers.offers(userId(request), saveId, clubId);
    }

    @GetMapping("/{saveId}/clubs/{clubId}/offers/paged")
    public PageResult<TransferMarketService.Offer> offersPage(
        HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "") String q
    ) {
        return transfers.offersPage(userId(request), saveId, clubId, page, size, q);
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers")
    public TransferMarketService.Offer submitOffer(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                    @RequestBody CareerController.OfferRequest body,
                                                    @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "SUBMIT_OFFER", TransferMarketService.Offer.class,
            () -> transfers.submit(owner, saveId, clubId, body.playerId(), body.fee()));
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/respond")
    public TransferMarketService.Offer respond(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                @PathVariable UUID offerId, @RequestBody CareerController.OfferResponse body,
                                                @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "RESPOND_OFFER", TransferMarketService.Offer.class,
            () -> transfers.respond(owner, saveId, clubId, offerId, body.action(), body.fee()));
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/terms")
    public TransferMarketService.Offer terms(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                              @PathVariable UUID offerId, @RequestBody CareerController.TermsRequest body) {
        return transfers.terms(userId(request), saveId, clubId, offerId, body.wage(), body.contractYears(), body.squadRole());
    }

    @PostMapping("/{saveId}/clubs/{clubId}/offers/{offerId}/complete")
    public TransferMarketService.Offer complete(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                                                 @PathVariable UUID offerId,
                                                 @RequestHeader(name = "X-Request-ID") UUID requestId) {
        var owner = userId(request);
        return ledger.execute(owner, saveId, requestId, "COMPLETE_OFFER", TransferMarketService.Offer.class,
            () -> transfers.complete(owner, saveId, clubId, offerId));
    }

    @PatchMapping("/{saveId}/clubs/{clubId}/players/{playerId}/transfer-status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void transferStatus(HttpServletRequest request, @PathVariable UUID saveId, @PathVariable UUID clubId,
                               @PathVariable UUID playerId, @RequestBody CareerController.TransferStatusRequest body) {
        transfers.setStatus(userId(request), saveId, clubId, playerId, body.status());
    }

    private static long userId(HttpServletRequest request) {
        return (Long) request.getAttribute(InternalGatewayFilter.USER_ID_ATTRIBUTE);
    }
}
