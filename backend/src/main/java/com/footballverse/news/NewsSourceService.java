package com.footballverse.news;

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

    @Transactional(readOnly = true)
    public List<NewsSourceResponse> sources() {
        return sources.findAll().stream().map(this::toSource).toList();
    }

    public NewsSourceResponse createSource(NewsSourceRequest request) {
        NewsSource source = sources.save(new NewsSource(request.name(), request.feedUrl()));
        return toSource(source);
    }

    public void deleteSource(Long id) {
        articles.detachSource(id);
        sources.deleteById(id);
    }

    public NewsSourceResponse toggleSource(Long id) {
        NewsSource source = sources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));
        source.setActive(!source.isActive());
        return toSource(sources.save(source));
    }

    private NewsSourceResponse toSource(NewsSource source) {
        return new NewsSourceResponse(source.getId(), source.getName(), source.getFeedUrl(), source.isActive());
    }
}
