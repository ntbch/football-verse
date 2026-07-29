export type Fixture = {
  id: number;
  fixtureId: string;
  leagueSlug: string;
  round: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "upcoming" | "live" | "result";
  userPrediction: UserPrediction | null;
};

export type UserPrediction = {
  id: number;
  matchId: number;
  pick: "home" | "draw" | "away";
  homeScore: number | null;
  awayScore: number | null;
  points: number;
  correct: boolean;
  correctOutcome: boolean | null;
  correctExactScore: boolean | null;
  correctOu25: boolean | null;
  correctBtts: boolean | null;
  pickOu25: string | null;
  pickBtts: string | null;
  scoringState: "NOT_READY" | "PENDING" | "SCORED";
};

export type PredictionScoreLog = {
  id: number;
  predictionId: number;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  points: number;
  outcomePoints: number;
  exactScorePoints: number;
  ou25Points: number;
  bttsPoints: number;
  reason: string;
  scoredAt: string | null;
};

export type StatsResponse = {
  totalPoints: number;
  correctPicks: number;
  totalPicks: number;
  currentStreak: number;
  bestStreak: number;
  badges: { code: string; awardedAt: string }[];
};

export type LeaderboardEntry = {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  correctPicks: number;
  totalPicks: number;
  rank: number;
};

export type LeaderboardEntryResponse = LeaderboardEntry;

export type CurrentLeaderboard = {
  period: "weekly" | "monthly" | "all";
  rank: number | null;
  points: number;
  correctPicks: number;
  totalPicks: number;
  accuracy: number;
};

export type CommunityPredictionDistribution = {
  fixtureId: number;
  home: number;
  draw: number;
  away: number;
  total: number;
};

export type PrivateLeagueMember = { userId: number; displayName: string; points: number; rank: number };
export type PrivateLeague = { id: number; name: string; owner: boolean; inviteCode: string | null; memberCount: number; members: PrivateLeagueMember[] };

export type AiPredictionSummary = {
  homePct: number;
  drawPct: number;
  awayPct: number;
  pick: string;
  pickLabel: string;
  correctScore: string | null;
  averageGoals: number;
  confidence: number;
  overUnder25: string;
  bothTeamsToScore: string;
  homeForm: string[];
  awayForm: string[];
  trend: string | null;
  sampleSize: number;
  sourceUpdatedAt: string | null;
};

export type SourceAvailability = {
  state: "AVAILABLE" | "NO_DATA" | "PROVIDER_UNAVAILABLE" | "UNSUPPORTED";
  provider: string | null;
  season: string | null;
  fetchedAt: string | null;
  sourceUpdatedAt: string | null;
  retryAfterSeconds: number | null;
};

export type MatchCentreFixture = {
  id: number;
  fixtureId: string;
  league: string;
  round: string | null;
  status: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  aiPrediction: AiPredictionSummary | null;
  userPrediction: UserPrediction | null;
};

export type StandingRow = {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  points: number;
  played: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
};

export type MatchCentreResponse = {
  league: string;
  round: string | null;
  fixtures: MatchCentreFixture[];
  standings: StandingRow[];
  rounds: string[];
  currentRound: string | null;
  fixturesAvailability?: SourceAvailability;
  standingsAvailability?: SourceAvailability;
  roundsAvailability?: SourceAvailability;
};

export type LineupCoverage = "PUBLISHED" | "AWAITING_OFFICIAL" | "UNSUPPORTED_COMPETITION" | "PROVIDER_UNAVAILABLE";

export type LineupPlayer = {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
};

export type LineupTeam = {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  formation: string | null;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type MatchLineups = {
  coverage: LineupCoverage;
  sourceUpdatedAt: string | null;
  fetchedAt: string | null;
  teams: LineupTeam[];
};

export type MatchDetailResponse = {
  fixture: MatchCentreFixture;
  lineups: MatchLineups;
};
