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
    public List<NewsSourceResponse> sources() {
        return sources.findAll().stream().map(this::toSource).toList();
    }

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

    public NewsSourceResponse toggleSource(Long id) {
        NewsSource source = sources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));
        source.setActive(!source.isActive());
        return toSource(sources.save(source));
    }

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
                source.getSourceType(),
                source.getCssSelector(),
                source.getProvider(),
                source.getPublisher() == null ? source.getName() : source.getPublisher().getName()
        );
    }
}
