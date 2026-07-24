package com.footballverse.game.dto;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Formation {
    FOUR_THREE_THREE("4-3-3"),
    FOUR_FOUR_TWO("4-4-2"),
    THREE_FIVE_TWO("3-5-2"),
    FOUR_TWO_THREE_ONE("4-2-3-1"),
    FOUR_ONE_FOUR_ONE("4-1-4-1"), FOUR_THREE_TWO_ONE("4-3-2-1"), FOUR_TWO_TWO_TWO("4-2-2-2"),
    FOUR_FOUR_ONE_ONE("4-4-1-1"), FOUR_FIVE_ONE("4-5-1"), FOUR_TWO_FOUR("4-2-4"),
    THREE_FOUR_THREE("3-4-3"), THREE_FOUR_TWO_ONE("3-4-2-1"), THREE_ONE_FOUR_TWO("3-1-4-2"),
    FIVE_THREE_TWO("5-3-2"), FIVE_TWO_THREE("5-2-3");

    private final String value;

    Formation(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
