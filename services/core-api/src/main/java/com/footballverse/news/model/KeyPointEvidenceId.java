package com.footballverse.news.model;

import java.io.Serializable;
import java.util.Objects;

public class KeyPointEvidenceId implements Serializable {
    private Long keyPoint;
    private Long rawItem;
    private String evidenceField;

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof KeyPointEvidenceId that)) return false;
        return Objects.equals(keyPoint, that.keyPoint)
                && Objects.equals(rawItem, that.rawItem)
                && Objects.equals(evidenceField, that.evidenceField);
    }

    @Override
    public int hashCode() {
        return Objects.hash(keyPoint, rawItem, evidenceField);
    }
}
