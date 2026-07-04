package com.footballverse.crawl;

public interface FeedFetcher {
    record FetchResult(byte[] body, boolean notModified) {}
    FetchResult fetch(String url);
}