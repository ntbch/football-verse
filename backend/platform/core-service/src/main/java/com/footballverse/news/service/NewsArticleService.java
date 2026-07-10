package com.footballverse.news.service;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsCategory;
import com.footballverse.news.model.NewsTag;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsBookmarkRepository;
import com.footballverse.news.repository.NewsCategoryRepository;
import com.footballverse.news.repository.NewsLikeRepository;
import com.footballverse.news.repository.NewsTagRepository;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.common.text.SlugUtil;
import com.footballverse.news.dto.NewsArticleRequest;
import com.footballverse.news.dto.NewsArticleResponse;
import com.footballverse.news.dto.NewsCategoryRequest;
import com.footballverse.news.dto.NewsCategoryResponse;
import com.footballverse.news.dto.NewsTagResponse;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NewsArticleService {
    private final NewsArticleRepository articles;
    private final NewsCategoryRepository categories;
    private final NewsTagRepository tags;
    private final NewsLikeRepository likes;
    private final NewsBookmarkRepository bookmarks;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> published(List<Long> categoryIds, List<Long> tagIds, int page, int size) {
        boolean hasCategories = categoryIds != null && !categoryIds.isEmpty();
        boolean hasTags = tagIds != null && !tagIds.isEmpty();
        return PageResponse.from(articles.filterPublishedArticles(
                hasCategories,
                categoryIds,
                hasTags,
                tagIds,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt"))
        ).map(this::toArticle));
    }

    private java.time.Instant parseInstant(String str) {
        if (str == null || str.isBlank()) return null;
        try {
            return java.time.Instant.parse(str);
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> adminArticles(int page, int size, ArticleStatus status, String search, Long categoryId, String startDateStr, String endDateStr) {
        org.springframework.data.domain.Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "publishedAt"));
        java.time.Instant startDate = parseInstant(startDateStr);
        java.time.Instant endDate = parseInstant(endDateStr);
        boolean hasStatus = (status != null);
        boolean hasDate = (startDate != null && endDate != null);
        String searchQuery = (search != null) ? search.trim() : "";
        return PageResponse.from(articles.adminFilterArticles(hasStatus, status, searchQuery, categoryId, hasDate, startDate, endDate, pageable).map(this::toArticle));
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Long> adminCounts(String search, Long categoryId, String startDateStr, String endDateStr) {
        java.time.Instant startDate = parseInstant(startDateStr);
        java.time.Instant endDate = parseInstant(endDateStr);
        boolean hasDate = (startDate != null && endDate != null);
        String searchQuery = (search != null) ? search.trim() : "";
        return java.util.Map.of(
                "PUBLISHED", articles.adminCountStatus(ArticleStatus.PUBLISHED, searchQuery, categoryId, hasDate, startDate, endDate),
                "DRAFT", articles.adminCountStatus(ArticleStatus.DRAFT, searchQuery, categoryId, hasDate, startDate, endDate),
                "ARCHIVED", articles.adminCountStatus(ArticleStatus.ARCHIVED, searchQuery, categoryId, hasDate, startDate, endDate)
        );
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

    public NewsArticleResponse createArticle(NewsArticleRequest request) {
        UserAccount author = currentUser.get();
        NewsArticle article = new NewsArticle();
        article.setTitle(request.title());
        article.setSlug(SlugUtil.uniqueSlug(request.title()));
        article.setSummary(request.summary());
        article.setContent(sanitizer.sanitize(request.content()));
        article.setStatus(request.status() == null ? ArticleStatus.DRAFT : request.status());
        article.setAuthor(author);
        if (article.getStatus() == ArticleStatus.PUBLISHED) article.setPublishedAt(Instant.now());
        if (request.categoryId() != null) {
            article.setCategory(categories.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("News category not found")));
        }
        if (request.tags() != null) {
            article.setTags(request.tags().stream().map(this::tag).collect(Collectors.toSet()));
        }
        return toArticle(articles.save(article));
    }

    public NewsArticleResponse updateArticle(Long id, NewsArticleRequest request) {
        NewsArticle article = adminArticle(id);
        article.setTitle(request.title());
        article.setSummary(request.summary());
        article.setContent(sanitizer.sanitize(request.content()));
        article.setCategory(request.categoryId() == null ? null : categories.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("News category not found")));
        article.setTags(request.tags() == null ? Set.of() : request.tags().stream().map(this::tag).collect(Collectors.toSet()));
        if (request.status() != null) applyStatus(article, request.status());
        return toArticle(articles.save(article));
    }

    public NewsArticleResponse updateStatus(Long id, ArticleStatus status) {
        NewsArticle article = adminArticle(id);
        applyStatus(article, status);
        return toArticle(articles.save(article));
    }

    public void deleteArticle(Long id) {
        NewsArticle article = adminArticle(id);
        applyStatus(article, ArticleStatus.DELETED);
        articles.save(article);
    }

    // --- categories ---

    @Transactional(readOnly = true)
    public List<NewsCategoryResponse> categories() {
        return categories.findAll().stream()
                .sorted(Comparator.comparing((NewsCategory c) -> "others".equals(c.getSlug())).thenComparing(NewsCategory::getId))
                .map(c -> new NewsCategoryResponse(c.getId(), c.getName(), c.getSlug()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NewsTagResponse> tags() {
        return tags.findAll().stream()
                .map(t -> new NewsTagResponse(t.getId(), t.getName(), t.getSlug()))
                .toList();
    }

    public NewsCategoryResponse createCategory(NewsCategoryRequest request) {
        NewsCategory category = categories.save(new NewsCategory(request.name(), SlugUtil.slug(request.name())));
        return new NewsCategoryResponse(category.getId(), category.getName(), category.getSlug());
    }

    // --- internal ---

    private NewsTag tag(String name) {
        String slug = SlugUtil.slug(name);
        return tags.findBySlug(slug).orElseGet(() -> tags.save(new NewsTag(name, slug)));
    }

    private NewsArticle adminArticle(Long id) {
        return articles.findByIdAndStatusNot(id, ArticleStatus.DELETED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
    }

    private void applyStatus(NewsArticle article, ArticleStatus status) {
        article.setStatus(status);
        if (status == ArticleStatus.PUBLISHED && article.getPublishedAt() == null) article.setPublishedAt(Instant.now());
    }

    private NewsArticleResponse toArticle(NewsArticle article) {
        com.footballverse.user.model.UserAccount user = currentUser.getOrNull();
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
}
