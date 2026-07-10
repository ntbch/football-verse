package com.footballverse.game.dto;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Formation {
    FOUR_THREE_THREE("4-3-3"),
    FOUR_FOUR_TWO("4-4-2"),
    THREE_FIVE_TWO("3-5-2"),
    FOUR_TWO_THREE_ONE("4-2-3-1");

    private final String value;

    Formation(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
