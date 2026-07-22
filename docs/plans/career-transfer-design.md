# Career transfer market design

## Understanding summary

- Build a full Career transfer market focused on a living AI world and scouting.
- AI clubs assess squad needs and buy or sell players across seasons.
- Scouting hides exact player quality and value until enough knowledge is earned.
- Negotiations support bids, counter-offers, contract terms, and up to three rounds.
- Use two transfer windows; scouting, listing, and negotiation may continue outside them, but completion may not.
- Keep each Career private and keep all transfer behavior inside `game-service`.
- Do not add PvP, ML, a new service, free-form agent negotiation, or a full finance ledger.

## Assumptions

- Dev/demo scale remains 4–20 clubs and at most a few thousand players per save.
- Daily AI market work should finish in under one second.
- Transfer completion must be transactional and idempotent.
- Contracts include wage, expiry, and squad role only.
- Loans, swaps, installments, bonuses, agent fees, release clauses, and free agents are outside this phase.
- `match-engine` remains stateless and unchanged.

## Architecture

Use a small database-backed state machine in `game-service`:

```text
SUBMITTED -> COUNTERED -> CLUB_ACCEPTED -> TERMS -> COMPLETED
     |            |              |          |
     +----------> REJECTED <------+----------+
                         \
                          -> EXPIRED
```

Both player-controlled and AI clubs use the same offer flow. Do not use event sourcing or store negotiation JSON on players.

### Data model

- Extend `players` with `wage`, `contract_until`, `squad_role`, and `transfer_status`.
- Add `transfer_offers` with Career, buyer, seller, player, fee, wage, contract years, squad role, status, round, expiry date, and timestamps.
- Add `scouting_reports` with Career, player, knowledge level, estimated value range, attribute ranges, and last scouted date.
- Extend `clubs` with `wage_budget`; continue using existing `balance` for transfer funds.
- Do not add `transfer_listings`; `players.transfer_status` is sufficient.

On completion, one transaction locks the offer, player, buyer, and seller. It rechecks the transfer window, status, ownership, balance, wage budget, and contract terms; moves the player; updates both clubs' money; writes the contract; and closes competing offers.

Transfer windows derive from Career game date and season schedule rather than a new configuration table.

## Transfer flow

```text
Scout player
-> Submit transfer fee
-> Seller accepts, rejects, or counters
-> Negotiate wage, role, and contract years
-> Player accepts, rejects, or counters
-> Complete atomically during an open window
```

Offers expire after three game days. Negotiation stops after three rounds. Outside an open window, clubs may scout, list, submit, and counter, but cannot complete a transfer.

Seller decisions consider asking value, squad depth, player importance, contract time remaining, transfer status, buyer reputation, and competing offers. Player decisions consider wage improvement, promised squad role, buyer reputation, contract length, and expected playing time.

## AI transfer market

AI market processing runs once during `advance-day`, after recovery and training. Each club performs at most one market action per day:

1. Score squad coverage by position, age, quality, fitness, and preferred tactic.
2. Select the largest position need and one surplus player.
3. Find at most ten affordable candidates.
4. Exclude own players, `NOT_FOR_SALE` players, unsuitable ages, and non-upgrades.
5. Rank remaining players by quality gain, age, tactic fit, fee, and wage.
6. Scout or bid for the best candidate and optionally list one surplus player.

AI choices use a deterministic seed derived from Career ID, game date, and club ID. Minimum positional coverage prevents clubs from selling below a playable squad, especially at goalkeeper.

## Scouting

User and AI clubs use the same four knowledge levels:

- `NONE`: name, age, position, and current club.
- `BASIC`: estimated overall within ±8 and a wide value range.
- `GOOD`: estimated overall within ±4 and attribute-group ranges.
- `FULL`: exact attributes, fitness, form, and estimated asking price.

Knowledge increases through daily scouting progress. Reports become stale after roughly one season; immutable facts such as age and position remain visible. No background worker is needed: `advance-day` updates progress and reports.

## API and UI

Replace immediate purchase behavior with offer resources:

- `GET /game/saves/{saveId}/clubs/{clubId}/market`
- `POST /game/saves/{saveId}/clubs/{clubId}/scouting/{playerId}`
- `GET|POST /game/saves/{saveId}/clubs/{clubId}/offers`
- `POST /game/saves/{saveId}/clubs/{clubId}/offers/{offerId}/respond`
- `POST /game/saves/{saveId}/clubs/{clubId}/offers/{offerId}/terms`
- `POST /game/saves/{saveId}/clubs/{clubId}/offers/{offerId}/complete`
- `PATCH /game/saves/{saveId}/clubs/{clubId}/players/{playerId}/transfer-status`

Add a dedicated Career Transfer tab with market filters, scout reports, negotiation inbox/outbox, sales listing controls, and transfer/wage budget headers. Market responses expose only fields allowed by the current scouting level.

## Reliability and errors

- Validate every transition against current offer status.
- Repeated completion requests return the existing result or `409`; they never charge twice.
- Row locks prevent competing buyers from completing the same player transfer.
- Closing a completed transfer rejects all other open offers for that player.
- Invalid ownership, closed window, insufficient balance, wage overflow, expired offers, and inadequate squad coverage return explicit conflicts.
- Career ownership checks apply to every market resource.

## Testing and balance

- Unit tests cover valid and invalid state transitions.
- Integration tests cover atomic and idempotent completion.
- Tests verify closed windows block completion.
- Tests verify each scouting level hides and reveals the correct data.
- Deterministic AI tests cover needs, surplus selection, bids, and minimum squad coverage.
- Boundary tests cover seller and player accept, reject, and counter decisions.
- Career smoke reports transfer count, spend, failed offers, squad-size range, bankrupt clubs, and AI runtime across multiple seasons.

Balance guards: one AI action per club per day, three negotiation rounds, minimum positional coverage, bounded fees and wages, and transfer/wage budget checks.

## Decision log

- Chose a full market prioritizing AI world simulation and scouting over negotiation depth alone.
- Chose medium negotiation depth with counter-offers and multiple rounds.
- Chose two transfer windows rather than year-round or one-window trading.
- Chose a DB state machine over event sourcing and negotiation JSON because it is queryable, durable, and simpler to protect transactionally.
- Chose a player transfer-status field over a separate listings table because a player has one market status while offers remain many-to-one.
- Chose shared AI/player market rules and shared scouting visibility.
- Chose four scouting levels and daily progress rather than background jobs.
- Chose deterministic, bounded AI processing with at most one action per club per day.
- Deferred loans, swaps, installments, full contract clauses, free agents, PvP, ML, and new services.
