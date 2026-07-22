# Career AI manager design

## Understanding summary

- Build a full manager system for AI clubs and the player-controlled manager.
- Managers have names, ages, reputation, career records, and multiple behavioral ratings.
- Managers control lineup, rotation, tactics, training, squad roles, and transfer strategy.
- Matchday plans react at halftime and to score, red cards, injuries, and fatigue.
- Boards set objectives and pressure; managers may be dismissed during or after a season.
- Unemployed managers may take new jobs; a dismissed player manager continues the Career through the job market.
- Keep the system rule-based, deterministic, private per Career, and owned by existing services.

## Assumptions

- A Career has 4–20 clubs, one active manager per club, and a small unemployed-manager pool.
- Pre-match decisions finish within 100 ms and a full match remains below 10 seconds.
- `game-service` owns manager context and policies; `match-engine` consumes immutable match plans.
- Dismissal, appointment, and career-record updates are transactional.
- Policy constants are versioned and measured by multi-season smoke reports.
- No ML, LLM, PvP, shared manager market, or new microservice is needed.

## Architecture

Add a `ManagerService` to `game-service`. All decisions use one numeric policy pipeline:

```text
DB context
-> hard constraints
-> candidate generation
-> base quality + traits + objectives + current context
-> deterministic tie-break
-> decision/result snapshot
```

Do not create archetype-specific scripts or a general behavior-tree framework. Small domain policy functions share the scoring pipeline. In-match reactions use bounded checkpoints and triggers.

### Data model

- `managers`: Career, name, age, reputation, status, current club, preferred tactic, and tactical/adaptability/rotation/youth/discipline/transfer/risk ratings.
- `manager_careers`: manager, club, joined/left dates, matches, wins, draws, losses, trophies, and dismissal reason.
- `manager_objectives`: manager, club, season, type, target, weight, progress, and status.
- `manager_decisions`: compact date, manager, domain, decision code, and JSON reason payload.
- `career_saves.player_manager_id`: the player manager; `managed_club_id` becomes nullable while unemployed.
- Move primary preferred-tactic ownership from club to manager while retaining club identity, reputation, and budgets.

Ratings use columns because they are few and frequently queried. Only variable-shape decision reasons use JSONB. Retain at most the current season of detailed decisions.

One club may have one active manager and one manager may have one active club. Appointment and dismissal lock the Career, manager, and club before changing assignments and career-history rows.

## Pre-match policy

- Choose formation from available squad fit and the manager's preferred tactic.
- Score selection using attributes, position fit, fitness, form, morale, promised role, and recent minutes.
- Keep valid formation positions and goalkeeper/bench coverage as hard constraints.
- Rotation protects tired players; risk favors immediate quality; youth favors prospects when the quality gap is small.
- Choose the starting tactic from manager preference, opponent style, relative strength, form, fatigue, and injuries.
- Generate decisions from a stable seed based on Career, fixture, manager, and rules version.

The player may override lineup and tactics. AI clubs consume the generated plan directly.

## Matchday reactions

`game-service` snapshots a `manager_plan` into `MatchInput`. It contains checkpoints at minutes 30, 45, 60, and 75 plus bounded event triggers:

- Trailing: raise mentality/tempo and reduce time wasting.
- Leading: preserve or continue attacking according to risk and discipline.
- Red card: change formation and remove an attacker or midfielder.
- Injury or severe fatigue: mandatory or protective substitution.
- Opponent high press or low block: use existing tactical counterplay.

Adaptability controls reaction strength and speed. Tactical rating reduces poor choices without becoming a direct match bonus. Apply at most one tactical reaction per checkpoint; forced injury/red-card responses are exempt.

`match-engine` remains stateless. It evaluates snapshot thresholds locally, applies tactic/substitution changes, and records manager-decision events. No mid-match network callback is introduced.

## Club management policy

- Training considers fixture congestion, squad weaknesses, fitness, and manager traits.
- Squad roles affect selection, morale, and transfer requests.
- Transfer scoring reuses the current need/surplus market and adds youth, transfer, and risk weights.
- Discipline affects handling of morale problems and player requests.
- Daily policies are bounded; expensive squad planning runs weekly or before fixtures.

Managers influence choices, not player attributes directly. Player quality remains the main match driver.

## Board pressure and lifecycle

Boards create weighted season objectives from club reputation and prior finish. Pressure changes after matches based on result, opponent strength, recent form, objective progress, dressing-room morale, and manager reputation.

Pressure bands are `SAFE`, `UNDER_PRESSURE`, and `CRITICAL`. `CRITICAL` triggers a deterministic board review after a match or at season end rather than immediate automatic dismissal. Reviews consider trend, compensation, objective weight, manager reputation, dismissal cooldown, and replacement availability.

Dismissal closes the active `manager_careers` row and creates a vacancy. AI clubs rank unemployed managers by reputation, tactic fit, traits, wage expectation, and recent record. Appointment opens a new career row and assigns the club.

When the player is dismissed, the Career becomes `UNEMPLOYED`; time may advance and the player may view, apply for, and accept suitable jobs. Accepting a role updates `managed_club_id`; the save and former-club history remain intact.

## API and UI

- `GET /game/managers/{managerId}` returns profile, traits, record, and current club.
- `GET /game/saves/{saveId}/manager` returns the player-manager dashboard.
- `GET /game/saves/{saveId}/clubs/{clubId}/manager` returns an opponent manager.
- `GET /game/saves/{saveId}/manager/objectives` returns board targets and pressure.
- `GET /game/saves/{saveId}/manager/decisions` returns recent explainable decisions.
- `GET /game/saves/{saveId}/jobs` lists vacancies and interest.
- `POST /game/saves/{saveId}/jobs/{clubId}/apply|accept` handles the job flow.

Add a Career Manager tab with profile, traits, board objectives, confidence trend, career history, recent explained decisions, and job-market actions. Match preview shows opponent manager style, likely formation/tactic, and recent changes. Stored match responses include both manager plans and resulting decision events.

## Reliability and edge cases

- Every generated lineup passes the same domain validation as player lineups.
- A deterministic fallback selects the best valid formation if a preferred plan cannot be built.
- Missing a playable squad returns a clear conflict instead of producing an invalid snapshot.
- Match plans are immutable input data, preserving replay determinism.
- Appointment and dismissal are idempotent and cannot double-assign a manager or club.
- Player dismissal never deletes the save or former-club data.
- Decision audit stores chosen outcomes and concise reasons, not every candidate score.

## Testing and balance

- Unit tests cover lineup scoring, rotation, tactics, training, reactions, and pressure thresholds.
- Seeded property-style loops verify all generated lineups remain valid.
- Determinism tests require identical plans for identical context and seed.
- Integration tests cover dismissal, vacancy, appointment, career history, and player unemployment.
- Match-engine tests cover checkpoint, tactic-change, and substitution events.
- Multi-season smoke reports sack rate, tenure, tactic diversity, youth minutes, rotation, vacancies, runtime, and invalid-lineup count.

Balance guards include dismissal cooldowns, moderate trait weights, one reaction per checkpoint, minimum squad coverage, and player quality remaining stronger than manager bonuses.

## Risks

- Sack churn can destabilize short seasons.
- Traits can overpower player quality or collapse managers into one optimal profile.
- Reaction spam can make timelines noisy and tactics unstable.
- Poor rotation can create an AI fatigue spiral.
- Job-market rules can leave clubs or the player unemployed indefinitely.

Measure these through seeded multi-season runs before tuning constants.

## Decision log

- Chose a full manager system covering matchday and club management.
- Chose named managers with multiple traits, reputation, and career records.
- Chose dismissal and club movement both during and after seasons.
- Chose contextual matchday reactions rather than pre-match-only behavior.
- Applied board pressure and dismissal rules to the player manager as well as AI managers.
- Chose a shared policy pipeline over archetype scripts and a general behavior tree.
- Chose rating columns and compact JSONB decision reasons.
- Chose immutable manager plans in `MatchInput` rather than mid-match callbacks.
- Chose persistent unemployed Careers and a job market rather than ending a save on dismissal.
- Deferred ML/LLM behavior, PvP, shared manager markets, and a new service.
