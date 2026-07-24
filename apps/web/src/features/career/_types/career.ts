import type { Position } from "./tactics";

export type TrainingFocus = "BALANCED" | "FITNESS" | "ATTACK" | "DEFENSE" | "MORALE";
export type CareerSave = { id: string; name: string; gameDate: string; status: string; seasonNumber: number; trainingFocus: TrainingFocus; managedClubId: string | null; playerManagerId: string | null };
export type ManagerObjective = { type: string; target: number; weight: number; progress: number; status: string };
export type ManagerDashboard = {
  id: string; name: string; age: number; reputation: number; status: string; clubId: string | null; clubName: string | null;
  preferredTactic: string; tactical: number; adaptability: number; rotation: number; youth: number; discipline: number;
  transfer: number; risk: number; boardPressure: number; pressure: string; matches: number; wins: number; draws: number;
  losses: number; objectives: ManagerObjective[];
};
export type ManagerJob = { club_id: string; club_name: string; reputation: number; status: string };
export type CareerFixture = { id: string; homeClubId: string; homeClubName: string; awayClubId: string; awayClubName: string; matchDate: string; status: string; matchdayNumber: number };
export type ClubStanding = { clubId: string; clubName: string; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };
export type SeasonSummary = { seasonNumber: number; championClubId: string; championClubName: string; finalTable: ClubStanding[] };
export type CareerDetails = { save: CareerSave; fixtures: CareerFixture[]; seasonSummary: SeasonSummary | null; history: SeasonSummary[] };
export type Player = {
  id: string; name: string; primary_position: Position; secondary_positions: Position[]; age: number;
  attributes: Record<string, number>; availability: "AVAILABLE" | "INJURED" | "SUSPENDED"; fitness: number; morale: number; form: number;
};
export type PlayerSeasonStats = { playerId: string; playerName: string; clubId: string; clubName: string; appearances: number; minutes: number; goals: number; assists: number; averageRating: number };
export type PageResult<T> = { items: T[]; page: number; size: number; totalItems: number; totalPages: number; dataVersion: number };
export type TransferCandidate = {
  playerId: string; playerName: string; position: Position; age: number; clubId: string; clubName: string;
  transferStatus: string; knowledge: "NONE" | "BASIC" | "GOOD" | "FULL"; scoutingProgress: number;
  overallMin: number; overallMax: number; valueMin: number; valueMax: number;
};
export type TransferMarket = { clubId: string; balance: number; wageBudget: number; windowOpen: boolean; players: TransferCandidate[] };
export type TransferMarketPage = PageResult<TransferCandidate> & { clubId: string; balance: number; wageBudget: number; windowOpen: boolean };
export type TransferOffer = {
  id: string; playerId: string; playerName: string; buyerClubId: string; buyerClubName: string; sellerClubId: string; sellerClubName: string;
  fee: number; wage: number | null; contractYears: number | null; squadRole: string | null; status: string; negotiationRound: number; expiresOn: string;
};
