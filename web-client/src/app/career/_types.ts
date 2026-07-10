export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1";
export type Position = "GK" | "LB" | "CB" | "RB" | "LWB" | "RWB" | "DM" | "CM" | "AM" | "LM" | "RM" | "LW" | "RW" | "ST";
export type PlayerRole = "GOALKEEPER" | "FULL_BACK" | "WING_BACK" | "CENTRAL_DEFENDER" | "BALL_WINNER" | "CENTRAL_MIDFIELDER" | "ADVANCED_PLAYMAKER" | "WINGER" | "INSIDE_FORWARD" | "POACHER" | "TARGET_FORWARD" | "PRESSING_FORWARD";

export type CareerSave = { id: string; name: string; gameDate: string; status: string; seasonNumber: number };
export type CareerFixture = {
  id: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  matchDate: string;
  status: string;
};
export type ClubStanding = {
  clubId: string; clubName: string; played: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; points: number;
};
export type SeasonSummary = {
  seasonNumber: number; championClubId: string; championClubName: string; finalTable: ClubStanding[];
};
export type CareerDetails = {
  save: CareerSave; fixtures: CareerFixture[]; seasonSummary: SeasonSummary | null; history: SeasonSummary[];
};
export type Player = {
  id: string;
  name: string;
  primary_position: Position;
  attributes: Record<string, number>;
  availability: "AVAILABLE" | "INJURED" | "SUSPENDED";
  fitness: number;
  morale: number;
  form: number;
};
export type LineupSlot = { player_id: string; position: Position; role: PlayerRole };
export type Lineup = { formation: Formation; starters: LineupSlot[]; bench: string[] };
export type Tactic = {
  mentality: "DEFENSIVE" | "CAUTIOUS" | "BALANCED" | "POSITIVE" | "ATTACKING";
  tempo: "SLOW" | "NORMAL" | "FAST";
  width: "NARROW" | "NORMAL" | "WIDE";
  passing_style: "SHORT" | "MIXED" | "DIRECT";
  pressing: "LOW" | "STANDARD" | "HIGH";
  defensive_line: "LOW" | "STANDARD" | "HIGH";
  transition: "HOLD_SHAPE" | "BALANCED" | "COUNTER";
  time_wasting: "OFF" | "MODERATE" | "HIGH";
};
export type PlayRequest = { seed: number; homeLineup: Lineup; homeTactic: Tactic };
export type MatchEvent = {
  sequence: number; minute: number; second: number; type: string;
  team_id: string | null; player_id: string | null; zone: string | null;
  payload: Record<string, string | number | boolean | null>;
};
export type TeamStats = {
  team_id: string; goals: number; shots: number; shots_on_target: number; xg: number;
  possession: number; passes_attempted: number; passes_completed: number; fouls: number;
  yellow_cards: number; red_cards: number;
};
export type PlayerStats = {
  player_id: string; team_id: string; minutes: number; rating: number; goals: number;
  assists: number; shots: number; passes_attempted: number; passes_completed: number; tackles: number;
};
export type MatchResult = {
  seed: number; engine_version: string; ruleset_version: string;
  home_team_id: string; away_team_id: string; home_score: number; away_score: number;
  events: MatchEvent[]; stats: { home: TeamStats; away: TeamStats; players: PlayerStats[] };
};
export type PlayResponse = { matchId: string; result: MatchResult };
