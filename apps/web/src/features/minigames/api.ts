import { data, http } from "@/shared/lib/api-client";

// Guest session is now managed server-side via HttpOnly cookie.
// On first load, ensure the cookie exists by hitting the guest-session endpoint.
let guestSessionInitialized = false;
const ensureGuestSession = async () => {
  if (guestSessionInitialized || typeof window === "undefined") return;
  try {
    await http.post("/minigames/guest-session");
    guestSessionInitialized = true;
  } catch {
    // Non-fatal: authenticated users don't need a guest cookie
  }
};
// Eagerly initialize on module load
ensureGuestSession();

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
  daily: () => data<DailyGames>(http.get("/minigames/daily")),
  start: (game: "who-am-i" | "grid", practice = false) => data<Attempt>(http.post(`/minigames/daily/${game}/attempt`, undefined, { params: { practice } })),
  players: (query: string) => data<PlayerOption[]>(http.get("/minigames/players", { params: { q: query } })),
  guess: (attemptId: number, payload: { playerId: number; cell?: string; version: number }) => data<Attempt>(http.post(`/minigames/attempts/${attemptId}/guess`, payload)),
  reveal: (attemptId: number, version: number) => data<Attempt>(http.post(`/minigames/attempts/${attemptId}/reveal`, { version })),
  claim: () => data<void>(http.post("/minigames/claim")),
  leaderboard: (scope: "combined" | "who-am-i" | "grid") => data<Leaderboard>(http.get("/minigames/leaderboard", { params: { scope } })),
};

</parameter>
</invoke>