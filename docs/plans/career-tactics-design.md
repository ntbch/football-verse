# Career tactics design

## Understanding summary

- Build deeper Career tactics before transfer depth and full AI manager work.
- Tactics should make match timelines feel different first, then affect result/xG.
- Use seven presets: Balanced, Gegenpress, Tiki-taka, Counter Attack, Park the Bus, Direct Long Ball, Wing Play.
- Let players choose a preset and still edit the existing detailed tactic fields.
- Let AI clubs pick tactics from club personality plus match context.
- Keep Python `match-engine` stateless and keep `prediction-service` unrelated.

## Assumptions

- Career V1 is still dev/demo scale.
- One match may take up to 10 seconds if the tactical simulation is meaningfully deeper.
- `game-service` can use DB context to choose AI tactics; `match-engine` only consumes `MatchInput`.
- Player quality remains the main driver; tactic matchups are clear but not absolute.

## Final design

### Architecture

- Frontend adds a preset selector in the existing Career tactics panel.
- Presets map to the existing tactic fields: mentality, tempo, width, passing style, pressing, defensive line, transition, and time wasting.
- `game-service` receives player tactics, chooses AI tactics, and sends both teams to `match-engine`.
- `match-engine` applies tactics to phases, probabilities, event volume, xG, fouls/cards, injuries, and fatigue.
- Add `clubs.preferred_tactic` for stable AI club personality. No separate tactic table yet.

### Presets

- Balanced: baseline.
- Gegenpress: more pressure, tackles, quick turnovers, and fast shots; higher foul/card/fatigue/injury risk.
- Tiki-taka: higher possession and pass completion; more pass events; weaker if trapped by low block.
- Counter Attack: less possession, faster transition, fewer but better shots.
- Park the Bus: suppresses opponent shots, creates fewer own chances, draw-friendly.
- Direct Long Ball: fast attacks and more turnovers; useful against high press.
- Wing Play: wide attacks and box entries; can stretch low blocks but risks turnovers if quality is low.

### Counterplay

- Gegenpress lightly counters Tiki-taka.
- Direct Long Ball lightly counters Gegenpress.
- Park the Bus lightly counters Counter/Gegenpress.
- Tiki-taka can beat Park the Bus if technical quality is high.
- Wing Play lightly helps against Park the Bus.

### AI tactic choice

- Each club has a preferred tactic.
- Before a match, `game-service` adjusts from preference:
  - weaker club: Counter Attack or Park the Bus;
  - fatigued/injured club: less pressing, safer tactics;
  - stronger/in-form club: preferred or more aggressive tactic;
  - facing high press: Direct Long Ball becomes more likely.

### Match-engine model

- Replace the current linear possession with phases: build-up, progress, final third, shot/turnover.
- Tactics affect:
  - tempo/time wasting: event count and attack speed;
  - passing style: completion vs speed to shot;
  - pressing/defensive line: turnovers, fouls/cards, space behind;
  - width: wide attacks vs central overload;
  - transition: counter chance after turnover;
  - mentality: risk/reward and defensive exposure.
- No 2D positioning model in this phase.

## Implementation plan

1. Add `preferred_tactic` to clubs and seed/backfill four current clubs.
2. Add shared preset mapping in frontend and `game-service`.
3. Add preset selector to Career tactics UI; selecting it updates existing fields.
4. Add AI tactic selection in `game-service` using club preference, strength, form, fitness, and injuries.
5. Refactor `match-engine` possession into phases with tactic modifiers.
6. Extend balance report to compare preset matchups.
7. Add/adjust tests for determinism, preset mapping, AI selection, and matchup report.
8. Update API/DATABASE/SMOKE docs.

## Decision log

- Rule-based preset engine chosen over full tactical model or data-driven config because it is enough depth with less code.
- Presets are shortcuts; existing tactic fields remain the source of truth sent to the engine.
- AI tactic selection lives in `game-service` because it needs DB context.
- `match-engine` remains stateless and owns only simulation behavior.
- Store only `clubs.preferred_tactic`; no tactic table until custom saved tactics exist.
- Keep counterplay clear but moderate so player quality still matters.
- Do not touch `prediction-service`.

## Risks

- Tactic bonuses can overpower player quality; balance report must compare preset matchups.
- More event phases can slow simulation; keep the target under 10 seconds per match.
- UI preset and backend preset mappings can drift; tests or shared constants should catch obvious mismatches.
