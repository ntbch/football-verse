import type { MatchEvent, TeamStats } from "../career/_types";

export const scoreAt = (events: MatchEvent[], teamId: string) =>
  events.filter((event) => event.type === "GOAL" && event.team_id === teamId).length;

export function matchSummary(home: TeamStats, away: TeamStats, homeName: string, awayName: string) {
  const possessionTeam = home.possession >= away.possession ? homeName : awayName;
  const shotTeam = home.shots >= away.shots ? homeName : awayName;
  return `${possessionTeam} controlled more possession. ${shotTeam} produced more attempts; the final score came from the stored engine timeline.`;
}
