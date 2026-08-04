import { data, http } from "@/shared/lib/api-client";

const guestToken = () => {
  if (typeof window === "undefined") return "";
  const current = window.localStorage.getItem("football-verse:minigame-guest");
  if (current) return current;
  const created = crypto.randomUUID();
  window.localStorage.setItem("football-verse:minigame-guest", created);
  return created;
};
const guestHeaders = () => ({ "X-Minigame-Guest": guestToken() });

export type GameType = "WHO_AM_I" | "GRID";
export type AttemptMode = "OFFICIAL" | "PRACTICE";
export type AttemptStatus = "ACTIVE" | "WON" | "LOST";

export type Attempt = {
  id: number;
  mode: AttemptMode;
  status: AttemptStatus;
  version: number;
  wrongGuesses: number;
  revealedClues: number;
  score: number;
  state: { guesses: { playerId: number; playerName: string; correct: boolean; comparison: Record<string, string> }[]; gridCells: Record<string, { playerId: number; playerName: string; correct: boolean }> };
  result: { answerName?: string; comparison?: Record<string, string> };
  startedAt: string;
  completedAt: string | null;
};

export type DailyGame = {
  type: GameType;
  available: boolean;
  challengeId: number | null;
  puzzle: {
    kind?: "who-am-i" | "grid";
    maxGuesses?: number;
    initialClues?: number;
    clues?: string[];
    rows?: string[];
    columns?: string[];
  };
  attempt: Attempt | null;
};

export type DailyGames = { date: string; games: DailyGame[] };
export type PlayerOption = { id: number; name: string };
export type LeaderboardEntry = { rank: number; username: string; displayName: string; avatarUrl: string | null; score: number; completedAt: string | null };
export type Leaderboard = { scope: "combined" | "who-am-i" | "grid"; entries: LeaderboardEntry[]; yourRank: number | null };

export const minigameApi = {
  daily: () => data<DailyGames>(http.get("/minigames/daily", { headers: guestHeaders() })),
  start: (game: "who-am-i" | "grid", practice = false) => data<Attempt>(http.post(`/minigames/daily/${game}/attempt`, undefined, { params: { practice }, headers: guestHeaders() })),
  players: (query: string) => data<PlayerOption[]>(http.get("/minigames/players", { params: { q: query }, headers: guestHeaders() })),
  guess: (attemptId: number, payload: { playerId: number; cell?: string; version: number }) => data<Attempt>(http.post(`/minigames/attempts/${attemptId}/guess`, payload, { headers: guestHeaders() })),
  reveal: (attemptId: number, version: number) => data<Attempt>(http.post(`/minigames/attempts/${attemptId}/reveal`, { version }, { headers: guestHeaders() })),
  claim: () => data<void>(http.post("/minigames/claim", undefined, { headers: guestHeaders() })),
  leaderboard: (scope: "combined" | "who-am-i" | "grid") => data<Leaderboard>(http.get("/minigames/leaderboard", { params: { scope } })),
};
