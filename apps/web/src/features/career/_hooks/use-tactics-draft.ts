"use client";

import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Formation, LineupSlot, Player, TacticalSetup, Tactic } from "../_types";
import { TACTIC_PRESETS } from "../_tactics";
import { remapFormation, type FormationRemapResult } from "../_formation-remap";

export function useTacticsDraft({ saveId, squad, saved, loading, dirtyRef }: {
  saveId: string; squad?: Player[]; saved?: TacticalSetup | null; loading: boolean;
  dirtyRef: MutableRefObject<boolean>;
}) {
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [tactic, setTactic] = useState<Tactic>(TACTIC_PRESETS.BALANCED);
  const [pending, setPending] = useState<FormationRemapResult | null>(null);
  const [error, setError] = useState("");
  const initialized = useRef("");

  useEffect(() => {
    if (!pending) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setPending(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [pending]);

  useEffect(() => {
    if (!squad?.length || loading || initialized.current === saveId) return;
    initialized.current = saveId;
    if (saved) {
      setFormation(saved.lineup.formation);
      setSlots(saved.lineup.starters);
      setBench(saved.lineup.bench);
      setTactic(saved.tactic);
      return;
    }
    const initial = remapFormation({ currentFormation: "4-3-3", currentSlots: [], currentBench: [], squad, nextFormation: "4-3-3" });
    setFormation(initial.formation);
    setSlots(initial.slots);
    setBench(initial.bench);
  }, [loading, saveId, saved, squad]);

  const valid = useMemo(() => {
    const starterIds = slots.map((slot) => slot.player_id);
    const known = new Set(squad?.map((player) => player.id));
    const unavailable = new Set(squad?.filter((player) => player.availability !== "AVAILABLE").map((player) => player.id));
    return starterIds.length === 11 && starterIds.every(Boolean) && new Set(starterIds).size === 11
      && bench.length <= 7 && new Set(bench).size === bench.length && bench.every((id) => !starterIds.includes(id))
      && [...starterIds, ...bench].every((id) => known.has(id) && !unavailable.has(id));
  }, [bench, slots, squad]);

  const dirty = useMemo(() => slots.length > 0 && JSON.stringify({ lineup: { formation, starters: slots, bench }, tactic }) !== JSON.stringify(saved),
    [bench, formation, saved, slots, tactic]);

  useEffect(() => {
    dirtyRef.current = dirty;
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, dirtyRef]);

  const preview = (next: Formation) => {
    if (!squad?.length || next === formation) return;
    try {
      setError("");
      setPending(remapFormation({ currentFormation: formation, currentSlots: slots, currentBench: bench, squad, nextFormation: next }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Formation could not be prepared.");
    }
  };

  const apply = () => {
    if (!pending) return;
    setFormation(pending.formation);
    setSlots(pending.slots);
    setBench(pending.bench);
    setPending(null);
  };

  return { formation, slots, setSlots, bench, setBench, tactic, setTactic, pending, setPending, error,
    valid, dirty, preview, apply, reset: () => { initialized.current = ""; } };
}
