package com.footballverse.news.clustering;

public interface EventClassifier {
    EventFamily classify(String title, String summary);
}
