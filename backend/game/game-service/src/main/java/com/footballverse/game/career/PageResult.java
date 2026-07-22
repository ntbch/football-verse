package com.footballverse.game.career;

import java.util.List;

public record PageResult<T>(List<T> items, int page, int size, long totalItems, int totalPages, long dataVersion) {
    public static <T> PageResult<T> of(List<T> items, int page, int size, long totalItems, long dataVersion) {
        return new PageResult<>(items, page, size, totalItems, (int) Math.ceil((double) totalItems / size), dataVersion);
    }
}
