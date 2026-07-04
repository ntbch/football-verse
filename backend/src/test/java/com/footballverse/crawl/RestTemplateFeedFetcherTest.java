package com.footballverse.crawl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RestTemplateFeedFetcherTest {

    private RestTemplate restTemplate;
    private RestTemplateFeedFetcher fetcher;

    @BeforeEach
    void setup() {
        restTemplate = mock(RestTemplate.class);
        fetcher = new RestTemplateFeedFetcher(5000, 15000, "test-ua", 2);
        ReflectionTestUtils.setField(fetcher, "restTemplate", restTemplate);
    }

    @Test
    void returnsNotModifiedOn304() {
        when(restTemplate.exchange(any(), eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.NOT_MODIFIED));

        FeedFetcher.FetchResult result = fetcher.fetch("http://example.com/feed");

        assertThat(result.notModified()).isTrue();
        assertThat(result.body()).isNull();
    }

    @Test
    void retriesOnServerErrorThenSucceeds() {
        when(restTemplate.exchange(any(), eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>("data".getBytes(), HttpStatus.OK));

        FeedFetcher.FetchResult result = fetcher.fetch("http://example.com/feed");

        assertThat(result.notModified()).isFalse();
        assertThat(new String(result.body())).isEqualTo("data");
        verify(restTemplate, times(3)).exchange(any(), eq(byte[].class));
    }

    @Test
    void givesUpAfterMaxRetries() {
        when(restTemplate.exchange(any(), eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.SERVICE_UNAVAILABLE));

        FeedFetcher.FetchResult result = fetcher.fetch("http://example.com/feed");

        assertThat(result.body()).isNull();
        assertThat(result.notModified()).isFalse();
        verify(restTemplate, times(3)).exchange(any(), eq(byte[].class));
    }
}