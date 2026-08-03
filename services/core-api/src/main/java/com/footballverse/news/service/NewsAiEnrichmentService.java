package com.footballverse.news.service;

import com.footballverse.news.model.NewsAiEnrichmentOutbox;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.StoryKeyPoint;
import com.footballverse.news.repository.NewsAiEnrichmentOutboxRepository;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.StoryKeyPointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsAiEnrichmentService {
    private static final int BATCH_SIZE = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int LEASE_MINUTES = 10;

    private final NewsAiEnrichmentOutboxRepository outbox;
    private final NewsArticleRepository articles;
    private final StoryKeyPointRepository keyPoints;
    private final AiSummaryService aiSummaryService;
    private final PlatformTransactionManager transactionManager;

    @Transactional
    public void enqueue(NewsArticle story, String title, String content, String fallbackSummary, String summaryBasisHash) {
        if (story == null || story.getId() == null || summaryBasisHash == null || summaryBasisHash.isBlank()) return;
        if (outbox.findByStoryIdAndSummaryBasisHash(story.getId(), summaryBasisHash).isPresent()) return;
        NewsAiEnrichmentOutbox item = new NewsAiEnrichmentOutbox();
        item.setStory(story);
        item.setTitle(title == null ? "Football Update" : title);
        item.setContent(content);
        item.setFallbackSummary(fallbackSummary);
        item.setSummaryBasisHash(summaryBasisHash);
        item.setStatus("PENDING");
        item.setNextAttemptAt(Instant.now());
        outbox.save(item);
    }

    @Scheduled(fixedDelayString = "${app.ai.outbox-poll-ms:5000}")
    public void processPending() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        List<Work> workItems = transactionTemplate.execute(status -> claimPending());
        if (workItems == null) return;
        for (Work work : workItems) {
            try {
                AiSummaryService.SummaryResult result = aiSummaryService.generateSummaryAndKeyPoints(
                        work.title(), work.content(), work.fallbackSummary());
                transactionTemplate.executeWithoutResult(status -> complete(work, result));
            } catch (Exception exception) {
                transactionTemplate.executeWithoutResult(status -> retry(work, exception));
            }
        }
    }

    protected List<Work> claimPending() {
        Instant now = Instant.now();
        return outbox.findPendingForUpdate(now, PageRequest.of(0, BATCH_SIZE)).stream()
                .map(item -> {
                    item.setStatus("PROCESSING");
                    item.setNextAttemptAt(now.plus(LEASE_MINUTES, ChronoUnit.MINUTES));
                    return new Work(item.getId(), item.getStory().getId(), item.getTitle(), item.getContent(),
                            item.getFallbackSummary(), item.getSummaryBasisHash(), item.getAttempts());
                })
                .toList();
    }

    protected void complete(Work work, AiSummaryService.SummaryResult result) {
        outbox.findById(work.id()).ifPresent(item -> {
            NewsArticle story = item.getStory();
            if (work.summaryBasisHash().equals(story.getSummaryBasisHash())) {
                story.setSummary(result.summary());
                keyPoints.deleteByStoryId(story.getId());
                int ordinal = 1;
                for (String text : result.keyPoints()) {
                    StoryKeyPoint point = new StoryKeyPoint();
                    point.setStory(story);
                    point.setOrdinal(ordinal++);
                    point.setText(text.trim());
                    point.setConfidence(BigDecimal.valueOf(result.aiGenerated() ? 0.95 : 0.50));
                    keyPoints.save(point);
                }
                articles.save(story);
            }
            item.setStatus("COMPLETED");
            item.setCompletedAt(Instant.now());
            item.setLastError(null);
            outbox.save(item);
        });
    }

    protected void retry(Work work, Exception exception) {
        outbox.findById(work.id()).ifPresent(item -> {
            int attempts = item.getAttempts() + 1;
            item.setAttempts(attempts);
            item.setLastError(exception.getClass().getSimpleName());
            if (attempts >= MAX_ATTEMPTS) {
                item.setStatus("FAILED");
                item.setFailedAt(Instant.now());
                log.error("AI enrichment permanently failed for story {} after {} attempts", work.storyId(), attempts);
            } else {
                item.setStatus("PENDING");
                item.setNextAttemptAt(Instant.now().plus(Math.min(60, 1L << attempts), ChronoUnit.SECONDS));
            }
            outbox.save(item);
        });
    }

    protected record Work(
            Long id,
            Long storyId,
            String title,
            String content,
            String fallbackSummary,
            String summaryBasisHash,
            int attempts
    ) {}
}
