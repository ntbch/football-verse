package com.footballverse.context.service;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.context.dto.FixtureContextResponse;
import com.footballverse.context.dto.FootballContextResponse;
import com.footballverse.context.dto.ContextAssignmentResponse;
import com.footballverse.context.model.FootballContext;
import com.footballverse.context.repository.FootballContextRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.forum.model.ForumThread;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FootballContextService {
    private final FixtureRepository fixtures;
    private final FootballContextRepository contexts;
    private final NewsArticleRepository articles;
    private final ForumThreadRepository threads;

    @Transactional(readOnly = true)
    public FixtureContextResponse fixtureContext(String providerFixtureId) {
        Fixture fixture = fixtures.findByFixtureId(providerFixtureId)
                .orElseThrow(() -> new ResourceNotFoundException("Fixture not found"));
        FootballContext context = contexts.findByFixtureId(fixture.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Football context not found"));
        return new FixtureContextResponse(
                new FootballContextResponse(context.getId(), context.getType(), context.getContextKey(), context.getDisplayName()),
                articles.findByContextsIdAndStatusOrderByPublishedAtDesc(context.getId(), ArticleStatus.PUBLISHED).stream()
                        .map(article -> new com.footballverse.context.dto.ContextualNewsResponse(
                                article.getTitle(), article.getSlug(), article.getSummary(), article.getImageUrl(), article.getPublishedAt()))
                        .toList(),
                threads.findByContextIdAndHiddenFalseOrderByLastActivityAtDesc(context.getId()).stream()
                        .map(thread -> new com.footballverse.context.dto.ContextualThreadResponse(
                                thread.getTitle(), thread.getSlug(), thread.getCategory().getName(), thread.getLastActivityAt()))
                        .toList()
        );
    }

    @Transactional
    public ContextAssignmentResponse setArticleContexts(Long articleId, List<Long> contextIds) {
        NewsArticle article = articles.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        List<FootballContext> requestedContexts = contextIds.stream().map(this::contextById).toList();
        article.getContexts().clear();
        article.getContexts().addAll(requestedContexts);
        articles.save(article);
        return new ContextAssignmentResponse(article.getId(), article.getContexts().stream().map(FootballContext::getId).toList());
    }

    @Transactional
    public ContextAssignmentResponse setThreadContext(Long threadId, Long contextId) {
        ForumThread thread = threads.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        FootballContext context = contextId == null ? null : contextById(contextId);
        thread.setContext(context);
        threads.save(thread);
        return new ContextAssignmentResponse(thread.getId(), context == null ? List.of() : List.of(context.getId()));
    }

    private FootballContext contextById(Long contextId) {
        return contexts.findById(contextId)
                .orElseThrow(() -> new ResourceNotFoundException("Football context not found"));
    }
}
