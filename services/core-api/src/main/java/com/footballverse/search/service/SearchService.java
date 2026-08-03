package com.footballverse.search.service;
import com.footballverse.user.model.UserAccount;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.forum.model.ForumThread;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumPostLikeRepository;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsBookmarkRepository;
import com.footballverse.news.repository.NewsLikeRepository;
import com.footballverse.news.model.NewsTag;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.search.dto.SearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import com.footballverse.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private final NewsArticleRepository articles;
    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumPostLikeRepository postLikes;
    private final NewsLikeRepository likes;
    private final NewsBookmarkRepository bookmarks;
    private final CurrentUser currentUser;

    public SearchResponse search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<NewsArticle> newsArticles = articles.searchPublishedArticles(query, pageable);
        NewsInteractions newsInteractions = newsInteractions(newsArticles.getContent());
        Page<NewsArticleResponse> newsResult = newsArticles.map(article -> toArticleResponse(article, newsInteractions));

        Page<ForumThread> forumThreads = threads.searchThreads(query, pageable);
        ThreadInteractions threadInteractions = threadInteractions(forumThreads.getContent());
        Page<ThreadResponse> forumResult = forumThreads.map(thread -> toThreadResponse(thread, threadInteractions));

        return new SearchResponse(
                PageResponse.from(newsResult),
                PageResponse.from(forumResult)
        );
    }

    private NewsArticleResponse toArticleResponse(NewsArticle article, NewsInteractions interactions) {
        com.footballverse.user.model.UserAccount user = currentUser.getOrNull();
        boolean isLiked = user != null && interactions.likedArticleIds().contains(article.getId());
        boolean isBookmarked = user != null && interactions.bookmarkedArticleIds().contains(article.getId());
        return new NewsArticleResponse(
                article.getId(), article.getTitle(), article.getSlug(),
                article.getSummary(), article.getContent(), article.getStatus(),
                article.getCategory() == null ? null : article.getCategory().getName(),
                article.getTags().stream().map(NewsTag::getName).collect(Collectors.toSet()),
                interactions.likeCounts().getOrDefault(article.getId(), 0L),
                interactions.bookmarkCounts().getOrDefault(article.getId(), 0L),
                article.getPublishedAt(),
                isLiked,
                isBookmarked,
                article.getContentKind(),
                article.getImageUrl(),
                article.getMediaType(),
                article.getVerificationStatus(),
                article.getSource() == null ? null : article.getSource().getName(),
                article.getSourceUrl(),
                article.getSourceCountCached(),
                article.getLastMaterialChangeAt(),
                java.util.List.of(),
                java.util.List.of()
        );
    }

    private ThreadResponse toThreadResponse(ForumThread thread, ThreadInteractions interactions) {
        return new ThreadResponse(
                thread.getId(),
                thread.getTitle(),
                thread.getSlug(),
                thread.getCategory().getName(),
                thread.getCategory().getSlug(),
                thread.getAuthor().getUsername(),
                thread.isPinned(),
                thread.isLocked(),
                thread.getCreatedAt(),
                thread.isSolved(),
                thread.getBestAnswer() == null ? null : thread.getBestAnswer().getId(),
                false,
                interactions.postCounts().getOrDefault(thread.getId(), 0L),
                interactions.likeCounts().getOrDefault(thread.getId(), 0L),
                thread.getLastActivityAt()
        );
    }

    private NewsInteractions newsInteractions(List<NewsArticle> articles) {
        List<Long> ids = articles.stream().map(NewsArticle::getId).toList();
        if (ids.isEmpty()) return new NewsInteractions(Map.of(), Map.of(), Set.of(), Set.of());
        UserAccount user = currentUser.getOrNull();
        return new NewsInteractions(
                counts(likes.countByArticleIds(ids)),
                counts(bookmarks.countByArticleIds(ids)),
                user == null ? Set.of() : Set.copyOf(likes.findArticleIdsByArticleIdInAndUserId(ids, user.getId())),
                user == null ? Set.of() : Set.copyOf(bookmarks.findArticleIdsByArticleIdInAndUserId(ids, user.getId()))
        );
    }

    private ThreadInteractions threadInteractions(List<ForumThread> threads) {
        List<Long> ids = threads.stream().map(ForumThread::getId).toList();
        if (ids.isEmpty()) return new ThreadInteractions(Map.of(), Map.of());
        return new ThreadInteractions(counts(posts.countVisibleByThreadIds(ids)), counts(postLikes.countByThreadIds(ids)));
    }

    private Map<Long, Long> counts(List<Object[]> rows) {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return result;
    }

    private record NewsInteractions(
            Map<Long, Long> likeCounts,
            Map<Long, Long> bookmarkCounts,
            Set<Long> likedArticleIds,
            Set<Long> bookmarkedArticleIds
    ) {}

    private record ThreadInteractions(Map<Long, Long> postCounts, Map<Long, Long> likeCounts) {}
}
