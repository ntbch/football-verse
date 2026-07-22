import type { Duty, Formation, LineupSlot, Player, PlayerRole, Position } from "../_types";

export type FormationRemapInput = { currentFormation: Formation; currentSlots: readonly LineupSlot[]; currentBench: readonly string[]; squad: readonly Player[]; nextFormation: Formation };
export type FormationMove = { playerId: string; playerName: string; from: Position | "BENCH" | "SQUAD"; to: Position | "BENCH" | "SQUAD"; reason: string };
export type FormationRoleReset = { playerId: string; playerName: string; fromRole: PlayerRole; fromDuty: Duty; toRole: PlayerRole; toDuty: Duty; reason: string };
export type FormationRemapPreview = { summary: string; moves: string[]; roleResets: string[]; moveDetails: FormationMove[]; roleResetDetails: FormationRoleReset[] };
export type FormationRemapResult = { formation: Formation; slots: LineupSlot[]; bench: string[]; preview: FormationRemapPreview };
