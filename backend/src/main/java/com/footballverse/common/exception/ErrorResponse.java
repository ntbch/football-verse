package com.footballverse.common.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        boolean success,
        String message,
        List<FieldError> errors,
        Instant timestamp
) {
    public static ErrorResponse of(String message, List<FieldError> errors) {
        return new ErrorResponse(false, message, errors, Instant.now());
    }

    public record FieldError(String field, String message) {
    }
}
