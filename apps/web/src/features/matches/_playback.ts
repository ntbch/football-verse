import type { Lineup, MatchEvent, TeamStats } from "../career/_types";

export const scoreAt = (events: MatchEvent[], teamId: string) =>
  events.filter((event) => event.type === "GOAL" && event.team_id === teamId).length;

export const draftSubstitutions = (applied: Lineup, draft: Lineup) => draft.starters.flatMap((slot, index) => {
  const current = applied.starters[index];
  return current && current.player_id !== slot.player_id && applied.bench.includes(slot.player_id)
    ? [{ outgoingPlayerId: current.player_id, incomingPlayerId: slot.player_id, position: slot.position }]
    : [];
});

export function matchSummary(home: TeamStats, away: TeamStats, homeName: string, awayName: string) {
  const possessionTeam = home.possession >= away.possession ? homeName : awayName;
  const shotTeam = home.shots >= away.shots ? homeName : awayName;
  return `${possessionTeam} controlled more possession. ${shotTeam} produced more attempts; the final score came from the stored engine timeline.`;
}
