package com.footballverse.game.career;

import com.footballverse.game.dto.Pressing;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TacticPresetsTest {
    @Test void mapsPresetsAndChoosesForContext() {
        assertEquals(Pressing.HIGH, TacticPresets.get("GEGENPRESS").pressing());
        assertEquals("PARK_THE_BUS", TacticPresets.choose("GEGENPRESS", 0, 70, 60, 0, null));
        assertEquals("DIRECT_LONG_BALL", TacticPresets.choose("BALANCED", 0, 100, 50, 0, TacticPresets.get("GEGENPRESS")));
        assertEquals("COUNTER_ATTACK", TacticPresets.choose("BALANCED", -6, 100, 60, 0, null));
    }
}
