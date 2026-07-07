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

export type AiPredictionSummary = {
  homePct: number;
  drawPct: number;
  awayPct: number;
  pick: string;
  pickLabel: string;
  correctScore: string;
  averageGoals: number;
  confidence: number;
  overUnder25: string;
  bothTeamsToScore: string;
  homeForm: string[];
  awayForm: string[];
  trend: string;
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
};
