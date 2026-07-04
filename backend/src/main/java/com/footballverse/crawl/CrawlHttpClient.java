package com.footballverse.crawl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class CrawlHttpClient {

    private final RestClient restClient;
    private final ConcurrentHashMap<String, String[]> etagCache = new ConcurrentHashMap<>();
    private final int retryMax;

    public CrawlHttpClient(
            @Value("${app.crawl.http.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${app.crawl.http.read-timeout-ms:15000}") int readTimeoutMs,
            @Value("${app.crawl.http.user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36}") String userAgent,
            @Value("${app.crawl.http.retry-max:2}") int retryMax) {
        this.retryMax = retryMax;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("User-Agent", userAgent)
                .build();
    }

    public byte[] fetchBytes(String url, boolean useEtag) {
        String[] cached = etagCache.get(url);
        String etag = cached != null ? cached[0] : null;
        String lastMod = cached != null ? cached[1] : null;

        for (int attempt = 0; attempt <= retryMax; attempt++) {
            try {
                var req = restClient.get().uri(URI.create(url));
                if (useEtag) req.header("If-None-Match", etag).header("If-Modified-Since", lastMod);

                var response = req.retrieve();
                var entity = response.toEntity(byte[].class);

                if (entity.getStatusCode() == HttpStatus.NOT_MODIFIED) {
                    log.debug("Source unchanged (304): {}", url);
                    return null;
                }
                if (entity.getStatusCode().is4xxClientError()) {
                    log.warn("Feed responded {} for url: {}", entity.getStatusCode().value(), url);
                    return null;
                }
                if (entity.getStatusCode().is5xxServerError()) {
                    throw new ResourceAccessException("Server error " + entity.getStatusCode().value());
                }

                if (useEtag) {
                    String newEtag = entity.getHeaders().getFirst("ETag");
                    String newLastMod = entity.getHeaders().getFirst("Last-Modified");
                    if (newEtag != null || newLastMod != null) {
                        etagCache.put(url, new String[]{newEtag, newLastMod});
                    }
                }
                return entity.getBody();
            } catch (ResourceAccessException e) {
                if (attempt < retryMax) {
                    int delayMs = 200 * (attempt + 1);
                    log.warn("Fetch timeout/connect error for {} (attempt {}/{}), retrying in {}ms",
                            url, attempt + 1, retryMax + 1, delayMs);
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return null; }
                } else {
                    log.error("Fetch exhausted retries for {}: {}", url, e.getMessage());
                    return null;
                }
            } catch (RestClientException e) {
                log.error("Fetch failed for {}: {}", url, e.getMessage());
                return null;
            }
        }
        return null;
    }

}