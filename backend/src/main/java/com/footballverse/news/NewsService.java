package com.footballverse.news;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.security.CurrentUser;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.news.dto.CommentResponse;
import com.footballverse.news.dto.NewsArticleRequest;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.dto.NewsCategoryRequest;
import com.footballverse.news.dto.NewsCategoryResponse;
import com.footballverse.news.dto.NewsSourceRequest;
import com.footballverse.news.dto.NewsSourceResponse;
import com.footballverse.user.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NewsService {
    private final NewsArticleRepository articles;
    private final NewsCategoryRepository categories;
    private final NewsTagRepository tags;
    private final NewsSourceRepository sources;
    private final NewsCommentRepository comments;
    private final NewsLikeRepository likes;
    private final NewsBookmarkRepository bookmarks;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> published(int page, int size) {
        return PageResponse.from(articles.findByStatus(ArticleStatus.PUBLISHED, PageRequest.of(page, size)).map(this::toArticle));
    }

    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> adminArticles(int page, int size) {
        return PageResponse.from(articles.findByStatusNot(ArticleStatus.DELETED, PageRequest.of(page, size)).map(this::toArticle));
    }

    @Transactional(readOnly = true)
    public NewsArticleResponse adminDetail(Long id) {
        return toArticle(adminArticle(id));
    }

    @Transactional(readOnly = true)
    public NewsArticleResponse detail(String slug) {
        return toArticle(articles.findBySlugAndStatus(slug, ArticleStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found")));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> comments(String slug) {
        NewsArticle article = articles.findBySlugAndStatus(slug, ArticleStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        return comments.findByArticleIdOrderByCreatedAtAsc(article.getId()).stream().map(this::toComment).toList();
    }

    @Transactional
    public NewsArticleResponse createArticle(NewsArticleRequest request) {
        UserAccount author = currentUser.get();
        NewsArticle article = new NewsArticle();
        article.setTitle(request.title());
        article.setSlug(uniqueSlug(request.title()));
        article.setSummary(request.summary());
        article.setContent(sanitizer.sanitize(request.content()));
        article.setStatus(request.status() == null ? ArticleStatus.DRAFT : request.status());
        article.setAuthor(author);
        if (article.getStatus() == ArticleStatus.PUBLISHED) {
            article.setPublishedAt(Instant.now());
        }
        if (request.categoryId() != null) {
            article.setCategory(categories.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("News category not found")));
        }
        if (request.tags() != null) {
            article.setTags(request.tags().stream().map(this::tag).collect(Collectors.toSet()));
        }
        return toArticle(articles.save(article));
    }

    @Transactional
    public NewsArticleResponse updateArticle(Long id, NewsArticleRequest request) {
        NewsArticle article = adminArticle(id);
        article.setTitle(request.title());
        article.setSummary(request.summary());
        article.setContent(sanitizer.sanitize(request.content()));
        article.setCategory(request.categoryId() == null ? null : categories.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("News category not found")));
        article.setTags(request.tags() == null ? Set.of() : request.tags().stream().map(this::tag).collect(Collectors.toSet()));
        if (request.status() != null) {
            applyStatus(article, request.status());
        }
        return toArticle(articles.save(article));
    }

    @Transactional
    public NewsArticleResponse updateStatus(Long id, ArticleStatus status) {
        NewsArticle article = adminArticle(id);
        applyStatus(article, status);
        return toArticle(articles.save(article));
    }

    @Transactional
    public void deleteArticle(Long id) {
        NewsArticle article = adminArticle(id);
        applyStatus(article, ArticleStatus.DELETED);
        articles.save(article);
    }

    @Transactional
    public NewsCategoryResponse createCategory(NewsCategoryRequest request) {
        NewsCategory category = categories.save(new NewsCategory(request.name(), slug(request.name())));
        return new NewsCategoryResponse(category.getId(), category.getName(), category.getSlug());
    }

    @Transactional(readOnly = true)
    public List<NewsCategoryResponse> categories() {
        return categories.findAll().stream()
                .map(category -> new NewsCategoryResponse(category.getId(), category.getName(), category.getSlug()))
                .toList();
    }

    @Transactional
    public NewsSourceResponse createSource(NewsSourceRequest request) {
        NewsSource source = sources.save(new NewsSource(request.name(), request.feedUrl()));
        return toSource(source);
    }

    @Transactional(readOnly = true)
    public List<NewsSourceResponse> sources() {
        return sources.findAll().stream().map(this::toSource).toList();
    }

    public int crawl() {
        // ponytail: endpoint is wired; add a real RSS parser when sources exist and ingestion is next.
        return 0;
    }

    @Transactional
    public boolean like(Long articleId) {
        UserAccount user = currentUser.get();
        NewsArticle article = articles.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        return likes.findByArticleAndUser(article, user)
                .map(like -> {
                    likes.delete(like);
                    return false;
                })
                .orElseGet(() -> {
                    likes.save(new NewsLike(article, user));
                    return true;
                });
    }

    @Transactional
    public boolean bookmark(Long articleId) {
        UserAccount user = currentUser.get();
        NewsArticle article = articles.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        return bookmarks.findByArticleAndUser(article, user)
                .map(bookmark -> {
                    bookmarks.delete(bookmark);
                    return false;
                })
                .orElseGet(() -> {
                    bookmarks.save(new NewsBookmark(article, user));
                    return true;
                });
    }

    @Transactional
    public CommentResponse comment(Long articleId, CommentRequest request) {
        NewsArticle article = articles.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        NewsComment comment = new NewsComment();
        comment.setArticle(article);
        comment.setAuthor(currentUser.get());
        comment.setContent(sanitizer.sanitize(request.content()));
        if (request.parentId() != null) {
            comment.setParent(comments.findById(request.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found")));
        }
        return toComment(comments.save(comment));
    }

    private NewsTag tag(String name) {
        String slug = slug(name);
        return tags.findBySlug(slug).orElseGet(() -> tags.save(new NewsTag(name, slug)));
    }

    private NewsArticle adminArticle(Long id) {
        return articles.findByIdAndStatusNot(id, ArticleStatus.DELETED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
    }

    private void applyStatus(NewsArticle article, ArticleStatus status) {
        article.setStatus(status);
        if (status == ArticleStatus.PUBLISHED && article.getPublishedAt() == null) {
            article.setPublishedAt(Instant.now());
        }
    }

    private NewsArticleResponse toArticle(NewsArticle article) {
        return new NewsArticleResponse(
                article.getId(),
                article.getTitle(),
                article.getSlug(),
                article.getSummary(),
                article.getContent(),
                article.getStatus(),
                article.getCategory() == null ? null : article.getCategory().getName(),
                article.getTags().stream().map(NewsTag::getName).collect(Collectors.toSet()),
                likes.countByArticleId(article.getId()),
                bookmarks.countByArticleId(article.getId()),
                article.getPublishedAt()
        );
    }

    private CommentResponse toComment(NewsComment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getParent() == null ? null : comment.getParent().getId(),
                comment.getAuthor().getUsername(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }

    private NewsSourceResponse toSource(NewsSource source) {
        return new NewsSourceResponse(source.getId(), source.getName(), source.getFeedUrl(), source.isActive());
    }

    private String uniqueSlug(String value) {
        return slug(value) + "-" + System.currentTimeMillis();
    }

    private String slug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
