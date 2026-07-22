import type { Tactic } from "./_types";

export const TACTIC_PRESETS = {
  BALANCED: { mentality: "BALANCED", tempo: "NORMAL", width: "NORMAL", passing_style: "MIXED", pressing: "STANDARD", defensive_line: "STANDARD", transition: "BALANCED", time_wasting: "OFF" },
  GEGENPRESS: { mentality: "ATTACKING", tempo: "FAST", width: "NORMAL", passing_style: "SHORT", pressing: "HIGH", defensive_line: "HIGH", transition: "COUNTER", time_wasting: "OFF" },
  TIKI_TAKA: { mentality: "POSITIVE", tempo: "SLOW", width: "NARROW", passing_style: "SHORT", pressing: "STANDARD", defensive_line: "HIGH", transition: "HOLD_SHAPE", time_wasting: "OFF" },
  COUNTER_ATTACK: { mentality: "CAUTIOUS", tempo: "FAST", width: "NORMAL", passing_style: "DIRECT", pressing: "LOW", defensive_line: "LOW", transition: "COUNTER", time_wasting: "MODERATE" },
  PARK_THE_BUS: { mentality: "DEFENSIVE", tempo: "SLOW", width: "NARROW", passing_style: "DIRECT", pressing: "LOW", defensive_line: "LOW", transition: "HOLD_SHAPE", time_wasting: "HIGH" },
  DIRECT_LONG_BALL: { mentality: "POSITIVE", tempo: "FAST", width: "NORMAL", passing_style: "DIRECT", pressing: "STANDARD", defensive_line: "STANDARD", transition: "COUNTER", time_wasting: "OFF" },
  WING_PLAY: { mentality: "POSITIVE", tempo: "FAST", width: "WIDE", passing_style: "MIXED", pressing: "STANDARD", defensive_line: "STANDARD", transition: "BALANCED", time_wasting: "OFF" },
} satisfies Record<string, Tactic>;

export type TacticPreset = keyof typeof TACTIC_PRESETS;
