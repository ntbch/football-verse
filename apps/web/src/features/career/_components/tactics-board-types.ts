import type { DragEvent } from "react";

export type BoardSelection = { kind: "starter" | "bench"; index: number };
export type BoardDrag = (event: DragEvent, target: BoardSelection) => void;
export type BoardDrop = (event: DragEvent, target: BoardSelection) => void;
