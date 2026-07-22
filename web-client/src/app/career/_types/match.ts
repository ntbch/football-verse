import type { Lineup, Tactic } from "./tactics";

export type PlayRequest = { seed: number; homeLineup: Lineup; homeTactic: Tactic };
export type MatchEvent = { sequence: number; minute: number; second: number; type: string; team_id: string | null; player_id: string | null; zone: string | null; payload: Record<string, string | number | boolean | null> };
export type TeamStats = { team_id: string; goals: number; shots: number; shots_on_target: number; xg: number; possession: number; passes_attempted: number; passes_completed: number; fouls: number; yellow_cards: number; red_cards: number };
export type PlayerStats = { player_id: string; team_id: string; minutes: number; rating: number; goals: number; assists: number; shots: number; passes_attempted: number; passes_completed: number; tackles: number };
export type MatchResult = { seed: number; engine_version: string; ruleset_version: string; home_team_id: string; away_team_id: string; home_score: number; away_score: number; events: MatchEvent[]; stats: { home: TeamStats; away: TeamStats; players: PlayerStats[] } };
export type PlayResponse = { matchId: string; result: MatchResult; matchdayNumber: number; simulatedAiMatchIds: string[]; failedFixtureIds: string[]; matchdayComplete: boolean };
export type MatchPauseReason = "KICKOFF" | "KEY_HIGHLIGHT" | "MILESTONE" | "HALF_TIME" | "INJURY" | "TACTICAL_DECISION" | "FULL_TIME";
export type MatchSessionTeam = { clubId?: string; id?: string; clubName?: string; name?: string; lineup?: Lineup; tactic?: Tactic; inactivePlayerIds?: string[] };
export type MatchSessionSnapshot = {
  id: string; fixtureId: string; matchId?: string | null; status: "ACTIVE" | "COMPLETED" | "ABANDONED" | string;
  version: number; minute: number; score?: { home: number; away: number }; homeScore?: number; awayScore?: number;
  pauseReason: MatchPauseReason | string; controlledClubId?: string; home?: MatchSessionTeam; away?: MatchSessionTeam;
  events?: MatchEvent[]; eventsSinceLastPause?: MatchEvent[];
  stats?: { home: Omit<TeamStats, "team_id"> & { team_id?: string }; away: Omit<TeamStats, "team_id"> & { team_id?: string }; players?: PlayerStats[] };
  substitutions?: { playersUsed: number; playersRemaining: number; windowsUsed: number; windowsRemaining: number; halftimeWindowFree: boolean };
  canContinue?: boolean; canFinish?: boolean;
};
export type MatchSessionAction = { requestId: string; expectedVersion: number };
export type MatchSessionCommandPayload =
  | { type: "TACTIC"; tactic: Tactic; lineup?: Lineup }
  | { type: "SHOUT"; shout: "ENCOURAGE" | "DEMAND_MORE" | "FOCUS" | "CALM_DOWN" }
  | { type: "SUBSTITUTION"; substitutions: { outgoingPlayerId: string; incomingPlayerId: string }[] };
export type MatchSessionCommand = MatchSessionAction & MatchSessionCommandPayload;
export type StartMatchSessionRequest = { requestId: string; seed?: number; lineup?: Lineup; tactic?: Tactic };
