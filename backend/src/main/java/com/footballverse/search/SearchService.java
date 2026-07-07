package com.footballverse.search;

import com.footballverse.common.pagination.PageResponse;
import com.footballverse.forum.ForumThread;
import com.footballverse.forum.ForumThreadRepository;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsBookmarkRepository;
import com.footballverse.news.NewsLikeRepository;
import com.footballverse.news.NewsTag;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.search.dto.SearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;
import com.footballverse.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private final NewsArticleRepository articles;
    private final ForumThreadRepository threads;
    private final NewsLikeRepository likes;
    private final NewsBookmarkRepository bookmarks;
    private final CurrentUser currentUser;

    public SearchResponse search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<NewsArticleResponse> newsResult = articles.searchPublishedArticles(query, pageable)
                .map(this::toArticleResponse);

        Page<ThreadResponse> forumResult = threads.searchThreads(query, pageable)
                .map(this::toThreadResponse);

        return new SearchResponse(
                PageResponse.from(newsResult),
                PageResponse.from(forumResult)
        );
    }

    private NewsArticleResponse toArticleResponse(NewsArticle article) {
        com.footballverse.user.UserAccount user = currentUser.getOrNull();
        boolean isLiked = false;
        boolean isBookmarked = false;
        if (user != null) {
            isLiked = likes.findByArticleAndUser(article, user).isPresent();
            isBookmarked = bookmarks.findByArticleAndUser(article, user).isPresent();
        }
        return new NewsArticleResponse(
                article.getId(), article.getTitle(), article.getSlug(),
                article.getSummary(), article.getContent(), article.getStatus(),
                article.getCategory() == null ? null : article.getCategory().getName(),
                article.getTags().stream().map(NewsTag::getName).collect(Collectors.toSet()),
                likes.countByArticleId(article.getId()), bookmarks.countByArticleId(article.getId()),
                article.getPublishedAt(),
                isLiked,
                isBookmarked
        );
    }

    private ThreadResponse toThreadResponse(ForumThread thread) {
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
                0,
                thread.getLastActivityAt()
        );
    }
}
