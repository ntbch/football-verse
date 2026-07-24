package com.footballverse.news.service;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.model.NewsBookmark;
import com.footballverse.news.model.NewsComment;
import com.footballverse.news.model.NewsCommentLike;
import com.footballverse.news.model.NewsLike;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.news.repository.NewsBookmarkRepository;
import com.footballverse.news.repository.NewsCommentLikeRepository;
import com.footballverse.news.repository.NewsCommentRepository;
import com.footballverse.news.repository.NewsLikeRepository;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.news.dto.CommentResponse;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.notification.service.MentionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NewsCommentService {
    private final NewsArticleRepository articles;
    private final NewsCommentRepository comments;
    private final NewsLikeRepository likes;
    private final NewsBookmarkRepository bookmarks;
    private final NewsCommentLikeRepository newsCommentLikeRepository;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;
    private final MentionService mentionService;

    @Transactional(readOnly = true)
    public List<CommentResponse> comments(String slug) {
        NewsArticle article = articles.findBySlugAndStatus(slug, ArticleStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
        return comments.findByArticleIdOrderByCreatedAtAsc(article.getId()).stream().map(this::toComment).toList();
    }

    public CommentResponse comment(Long articleId, CommentRequest request) {
        NewsArticle article = publishedArticle(articleId);
        NewsComment comment = new NewsComment();
        comment.setArticle(article);
        comment.setAuthor(currentUser.get());
        comment.setContent(sanitizer.sanitize(request.content()));
        if (request.parentId() != null) {
            NewsComment parent = comments.findById(request.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            if (!parent.getArticle().getId().equals(article.getId())) {
                throw new BadRequestException("Parent comment must belong to the same article");
            }
            comment.setParent(parent);
        }
        NewsComment saved = comments.save(comment);
        mentionService.processMentions(comment.getAuthor(), request.content(), "%s mentioned you in a comment", "/news/" + article.getSlug());
        return toComment(saved);
    }

    public boolean like(Long articleId) {
        UserAccount user = currentUser.get();
        NewsArticle article = publishedArticle(articleId);
        return likes.findByArticleAndUser(article, user)
                .map(like -> { likes.delete(like); return false; })
                .orElseGet(() -> { likes.save(new NewsLike(article, user)); return true; });
    }

    public boolean bookmark(Long articleId) {
        UserAccount user = currentUser.get();
        NewsArticle article = publishedArticle(articleId);
        return bookmarks.findByArticleAndUser(article, user)
                .map(bookmark -> { bookmarks.delete(bookmark); return false; })
                .orElseGet(() -> { bookmarks.save(new NewsBookmark(article, user)); return true; });
    }

    public boolean toggleLikeComment(Long commentId) {
        UserAccount user = currentUser.get();
        NewsComment comment = comments.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        return newsCommentLikeRepository.findByCommentIdAndUserId(commentId, user.getId())
                .map(like -> {
                    newsCommentLikeRepository.delete(like);
                    return false;
                })
                .orElseGet(() -> {
                    newsCommentLikeRepository.save(new NewsCommentLike(comment, user));
                    return true;
                });
    }

    private NewsArticle publishedArticle(Long articleId) {
        return articles.findByIdAndStatus(articleId, ArticleStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));
    }

    private CommentResponse toComment(NewsComment comment) {
        long likeCount = newsCommentLikeRepository.countByCommentId(comment.getId());
        UserAccount current = currentUser.getOrNull();
        boolean liked = current != null && newsCommentLikeRepository.existsByCommentIdAndUserId(comment.getId(), current.getId());
        
        return new CommentResponse(
                comment.getId(),
                comment.getParent() == null ? null : comment.getParent().getId(),
                comment.getAuthor().getUsername(),
                comment.getContent(),
                comment.getCreatedAt(),
                likeCount,
                liked
        );
    }
}
