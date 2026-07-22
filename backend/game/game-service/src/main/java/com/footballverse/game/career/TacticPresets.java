package com.footballverse.game.career;

import com.footballverse.game.dto.*;

import java.util.Locale;
import java.util.Map;

final class TacticPresets {
    private static final Map<String, Tactic> PRESETS = Map.of(
        "BALANCED", tactic(Mentality.BALANCED, Tempo.NORMAL, Width.NORMAL, PassingStyle.MIXED, Pressing.STANDARD, DefensiveLine.STANDARD, Transition.BALANCED, TimeWasting.OFF),
        "GEGENPRESS", tactic(Mentality.ATTACKING, Tempo.FAST, Width.NORMAL, PassingStyle.SHORT, Pressing.HIGH, DefensiveLine.HIGH, Transition.COUNTER, TimeWasting.OFF),
        "TIKI_TAKA", tactic(Mentality.POSITIVE, Tempo.SLOW, Width.NARROW, PassingStyle.SHORT, Pressing.STANDARD, DefensiveLine.HIGH, Transition.HOLD_SHAPE, TimeWasting.OFF),
        "COUNTER_ATTACK", tactic(Mentality.CAUTIOUS, Tempo.FAST, Width.NORMAL, PassingStyle.DIRECT, Pressing.LOW, DefensiveLine.LOW, Transition.COUNTER, TimeWasting.MODERATE),
        "PARK_THE_BUS", tactic(Mentality.DEFENSIVE, Tempo.SLOW, Width.NARROW, PassingStyle.DIRECT, Pressing.LOW, DefensiveLine.LOW, Transition.HOLD_SHAPE, TimeWasting.HIGH),
        "DIRECT_LONG_BALL", tactic(Mentality.POSITIVE, Tempo.FAST, Width.NORMAL, PassingStyle.DIRECT, Pressing.STANDARD, DefensiveLine.STANDARD, Transition.COUNTER, TimeWasting.OFF),
        "WING_PLAY", tactic(Mentality.POSITIVE, Tempo.FAST, Width.WIDE, PassingStyle.MIXED, Pressing.STANDARD, DefensiveLine.STANDARD, Transition.BALANCED, TimeWasting.OFF)
    );

    private TacticPresets() {}

    static Tactic get(String name) {
        return PRESETS.getOrDefault(name == null ? "" : name.toUpperCase(Locale.ROOT), PRESETS.get("BALANCED"));
    }

    static String choose(String preferred, int strengthDifference, double fitness, double form,
                         long unavailablePlayers, Tactic opponent) {
        if (fitness < 75 || unavailablePlayers >= 3) return "PARK_THE_BUS";
        if (opponent != null && opponent.pressing() == Pressing.HIGH) return "DIRECT_LONG_BALL";
        if (strengthDifference <= -5) return form >= 55 ? "COUNTER_ATTACK" : "PARK_THE_BUS";
        if (strengthDifference >= 5 && form >= 55) return "GEGENPRESS";
        return PRESETS.containsKey(preferred) ? preferred : "BALANCED";
    }

    private static Tactic tactic(Mentality mentality, Tempo tempo, Width width, PassingStyle passing,
                                 Pressing pressing, DefensiveLine line, Transition transition, TimeWasting wasting) {
        return new Tactic(mentality, tempo, width, passing, pressing, line, transition, wasting);
    }
}
