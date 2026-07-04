package com.footballverse.crawl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RestTemplateFeedFetcher implements FeedFetcher {

    private final RestTemplate restTemplate;
    private final ConcurrentHashMap<String, String[]> etagCache = new ConcurrentHashMap<>();
    private final int retryMax;

    public RestTemplateFeedFetcher(
            @Value("${app.crawl.http.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${app.crawl.http.read-timeout-ms:15000}") int readTimeoutMs,
            @Value("${app.crawl.http.user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36}") String userAgent,
            @Value("${app.crawl.http.retry-max:2}") int retryMax) {
        this.retryMax = retryMax;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);
        this.restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().set("User-Agent", userAgent);
            return execution.execute(request, body);
        });
    }

    @Override
    public FetchResult fetch(String url) {
        String[] cached = etagCache.get(url);
        String etag = cached != null ? cached[0] : null;
        String lastModified = cached != null ? cached[1] : null;

        for (int attempt = 0; attempt <= retryMax; attempt++) {
            try {
                RequestEntity<Void> request = RequestEntity.get(URI.create(url))
                        .header("If-None-Match", etag)
                        .header("If-Modified-Since", lastModified)
                        .build();
                ResponseEntity<byte[]> response = restTemplate.exchange(request, byte[].class);

                if (response.getStatusCode() == HttpStatus.NOT_MODIFIED) {
                    log.debug("Source unchanged (304): {}", url);
                    return new FetchResult(null, true);
                }
                if (response.getStatusCode().is4xxClientError()) {
                    log.warn("Feed responded {} for url: {}", response.getStatusCode().value(), url);
                    return new FetchResult(null, false);
                }
                if (response.getStatusCode().is5xxServerError()) {
                    // ponytail: real RestTemplate throws HttpServerErrorException (a RestClientException,
                    // handled below) by default; this branch covers the response-object path so retry is consistent.
                    throw new ResourceAccessException("Server error " + response.getStatusCode().value());
                }

                String newEtag = response.getHeaders().getFirst("ETag");
                String newLastMod = response.getHeaders().getFirst("Last-Modified");
                if (newEtag != null || newLastMod != null) {
                    etagCache.put(url, new String[]{newEtag, newLastMod});
                }
                return new FetchResult(response.getBody(), false);
            } catch (ResourceAccessException e) {
                if (attempt < retryMax) {
                    int delayMs = 200 * (attempt + 1);
                    log.warn("Fetch timeout/connect error for {} (attempt {}/{}), retrying in {}ms",
                            url, attempt + 1, retryMax + 1, delayMs);
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return new FetchResult(null, false); }
                } else {
                    log.error("Fetch exhausted retries for {}: {}", url, e.getMessage());
                    return new FetchResult(null, false);
                }
            } catch (RestClientException e) {
                log.error("Fetch failed for {}: {}", url, e.getMessage());
                return new FetchResult(null, false);
            }
        }
        return new FetchResult(null, false);
    }
}