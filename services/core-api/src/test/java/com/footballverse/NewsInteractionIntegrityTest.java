package com.footballverse;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsBookmarkRepository;
import com.footballverse.news.repository.NewsCommentRepository;
import com.footballverse.news.service.NewsCommentService;
import com.footballverse.news.repository.NewsLikeRepository;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
public class NewsInteractionIntegrityTest {
    @Autowired
    private NewsArticleRepository articles;

    @Autowired
    private NewsCommentRepository comments;

    @Autowired
    private NewsLikeRepository likes;

    @Autowired
    private NewsBookmarkRepository bookmarks;

    @Autowired
    private NewsCommentService service;

    @Autowired
    private UserAccountRepository users;

    @MockBean
    private CurrentUser currentUser;

    private UserAccount user;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString();
        user = users.saveAndFlush(new UserAccount(
                "interaction-" + suffix + "@footballverse.local",
                "interaction-" + suffix.substring(0, 12),
                "hash"
        ));
        when(currentUser.get()).thenReturn(user);
    }

    @Test
    void rejectsNestedCommentParentFromAnotherArticle() {
        NewsArticle first = articles.saveAndFlush(article("Parent Article", "parent-" + UUID.randomUUID(), ArticleStatus.PUBLISHED));
        NewsArticle second = articles.saveAndFlush(article("Reply Article", "reply-" + UUID.randomUUID(), ArticleStatus.PUBLISHED));
        Long parentId = service.comment(first.getId(), new CommentRequest(null, "Root comment")).id();

        assertThatThrownBy(() -> service.comment(second.getId(), new CommentRequest(parentId, "Wrong parent")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Parent comment must belong to the same article");
    }

    @Test
    void keepsExistingInteractionsStableAcrossAdminStatusChanges() {
        NewsArticle article = articles.saveAndFlush(article("Lifecycle Article", "lifecycle-" + UUID.randomUUID(), ArticleStatus.PUBLISHED));

        assertThat(service.like(article.getId())).isTrue();
        assertThat(service.bookmark(article.getId())).isTrue();
        service.comment(article.getId(), new CommentRequest(null, "Visible while published"));

        article.setStatus(ArticleStatus.ARCHIVED);
        articles.saveAndFlush(article);

        assertThatThrownBy(() -> service.like(article.getId()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Article not found");
        assertThatThrownBy(() -> service.bookmark(article.getId()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Article not found");
        assertThatThrownBy(() -> service.comment(article.getId(), new CommentRequest(null, "Blocked while archived")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Article not found");
        assertThatThrownBy(() -> service.comments(article.getSlug()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Article not found");

        assertThat(likes.countByArticleId(article.getId())).isEqualTo(1);
        assertThat(bookmarks.countByArticleId(article.getId())).isEqualTo(1);
        assertThat(comments.findByArticleIdOrderByCreatedAtAsc(article.getId())).hasSize(1);

        article.setStatus(ArticleStatus.PUBLISHED);
        articles.saveAndFlush(article);

        assertThat(service.comments(article.getSlug())).hasSize(1);
        assertThat(service.like(article.getId())).isFalse();
        assertThat(service.bookmark(article.getId())).isFalse();
    }

    private NewsArticle article(String title, String slug, ArticleStatus status) {
        NewsArticle article = new NewsArticle();
        article.setTitle(title);
        article.setSlug(slug);
        article.setSummary(title + " summary");
        article.setContent("<p>" + title + "</p>");
        article.setStatus(status);
        article.setPublishedAt(Instant.now());
        article.setAuthor(user);
        return article;
    }
}
