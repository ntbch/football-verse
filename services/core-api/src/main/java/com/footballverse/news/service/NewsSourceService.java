package com.footballverse.news.service;
import com.footballverse.news.model.NewsSource;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsSourceRepository;
import com.footballverse.news.repository.PublisherRepository;
import com.footballverse.news.repository.RawItemRepository;
import com.footballverse.news.model.Publisher;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.news.dto.NewsSourceRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NewsSourceService {
    private final NewsSourceRepository sources;
    private final NewsArticleRepository articles;
    private final PublisherRepository publishers;
    private final RawItemRepository rawItems;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "newsSources")
    public List<NewsSourceResponse> sources() {
        return sources.findAll().stream().map(this::toSource).toList();
    }

    @CacheEvict(cacheNames = "newsSources", allEntries = true)
    public NewsSourceResponse createSource(NewsSourceRequest request) {
        NewsSource source = new NewsSource(request.name(), request.feedUrl());
        // ponytail: fallback RSS when type is null (backward compat with admin UI sans type)
        if (request.sourceType() != null) source.setSourceType(request.sourceType());
        source.setCssSelector(request.cssSelector());
        source.setProvider(request.provider() == null || request.provider().isBlank()
                ? "rss"
                : request.provider().trim().toLowerCase(java.util.Locale.ROOT));
        Publisher publisher = publishers.findByName(request.name())
                .orElseGet(() -> publishers.save(new Publisher(request.name())));
        source.setPublisher(publisher);
        source = sources.save(source);
        return toSource(source);
    }

    @CacheEvict(cacheNames = "newsSources", allEntries = true)
    public boolean deleteSource(Long id) {
        NewsSource source = sources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));
        if (rawItems.existsByConnectorId(id)) {
            source.setActive(false);
            sources.save(source);
            return false;
        }
        articles.detachSource(id);
        sources.deleteById(id);
        return true;
    }

    @CacheEvict(cacheNames = "newsSources", allEntries = true)
    public NewsSourceResponse toggleSource(Long id) {
        NewsSource source = sources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));
        source.setActive(!source.isActive());
        return toSource(sources.save(source));
    }

    @CacheEvict(cacheNames = "newsSources", allEntries = true)
    public NewsSourceResponse toggleAutoPublish(Long id) {
        NewsSource source = sources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));
        source.setAutoPublish(!source.isAutoPublish());
        return toSource(sources.save(source));
    }

    private NewsSourceResponse toSource(NewsSource source) {
        return new NewsSourceResponse(
                source.getId(),
                source.getName(),
                source.getFeedUrl(),
                source.isActive(),
                source.isAutoPublish(),
                resolveEffectiveType(source),
                source.getCssSelector(),
                source.getProvider(),
                source.getPublisher() == null ? source.getName() : source.getPublisher().getName(),
                source.getFetchIntervalSeconds()
        );
    }

    /**
     * Resolves the effective source type by applying classification rules.
     * Ports the frontend's getEffectiveProvider logic: checks provider, sourceType,
     * feedUrl, and name fields in priority order to determine the canonical category.
     */
    private com.footballverse.news.model.NewsSourceType resolveEffectiveType(NewsSource source) {
        String provider = source.getProvider() == null ? "" : source.getProvider().toLowerCase(java.util.Locale.ROOT);
        String url = source.getFeedUrl() == null ? "" : source.getFeedUrl().toLowerCase(java.util.Locale.ROOT);
        String name = source.getName() == null ? "" : source.getName().toLowerCase(java.util.Locale.ROOT);
        com.footballverse.news.model.NewsSourceType stored = source.getSourceType();

        // Reddit detection
        if (provider.equals("reddit") || stored == com.footballverse.news.model.NewsSourceType.REDDIT
                || url.contains("reddit.com") || name.contains("(reddit)") || url.contains("/r/")) {
            return com.footballverse.news.model.NewsSourceType.REDDIT;
        }
        // Twitter/X detection
        if (provider.equals("x") || provider.equals("twitter") || stored == com.footballverse.news.model.NewsSourceType.TWITTER
                || url.contains("x.com") || url.contains("twitter.com") || name.contains("(x)")) {
            return com.footballverse.news.model.NewsSourceType.TWITTER;
        }
        // YouTube detection
        if (provider.equals("youtube") || stored == com.footballverse.news.model.NewsSourceType.YOUTUBE
                || url.contains("youtube.com") || name.contains("youtube")) {
            return com.footballverse.news.model.NewsSourceType.YOUTUBE;
        }
        // GNews detection
        if (provider.equals("gnews") || stored == com.footballverse.news.model.NewsSourceType.GNEWS
                || url.contains("gnews")) {
            return com.footballverse.news.model.NewsSourceType.GNEWS;
        }
        // Default to RSS
        return com.footballverse.news.model.NewsSourceType.RSS;
    }
}
