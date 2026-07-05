export type MatchStatus = "upcoming" | "live" | "result";

export type MatchTeam = {
  id: string;
  name: string;
  logo?: string;
};

export type MatchFixture = {
  id: string;
  league: string;
  round?: string;
  status: MatchStatus;
  kickoff: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  score: {
    home: number | null;
    away: number | null;
  };
};

export type StandingRow = {
  rank: number;
  team: MatchTeam;
  points: number;
  played: number;
};

export type FixtureResponse = {
  source: string;
  league?: string;
  note?: string;
  fixtures: MatchFixture[];
};

export type RoundsResponse = {
  source: string;
  league?: string;
  currentRound: string | null;
  rounds: string[];
};

export type StandingsResponse = {
  source: string;
  league?: string;
  note?: string;
  standings: StandingRow[];
};

export type MatchPrediction = {
  fixture: MatchFixture;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  pick: "home" | "draw" | "away";
  pickLabel: string;
  correctScore: string;
  averageGoals: number;
  confidence: number;
  markets: {
    oneXTwo: "home" | "draw" | "away";
    overUnder25: "over" | "under";
    bothTeamsToScore: "yes" | "no";
  };
  form: {
    home: string[];
    away: string[];
  };
  trend: string;
};

export type PredictionsResponse = {
  source: string;
  league?: string;
  round?: string;
  predictions: MatchPrediction[];
};
