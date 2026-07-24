package com.footballverse.forum.service;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.common.text.SlugUtil;
import com.footballverse.forum.dto.ForumCategoryRequest;
import com.footballverse.forum.dto.ForumCategoryResponse;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ThreadDetailResponse;
import com.footballverse.forum.dto.ThreadRequest;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.forum.model.ForumCategory;
import com.footballverse.forum.model.ForumPost;
import com.footballverse.forum.model.ForumThread;
import com.footballverse.forum.model.ForumThreadFollow;
import com.footballverse.forum.repository.ForumCategoryRepository;
import com.footballverse.forum.repository.ForumPostLikeRepository;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumThreadFollowRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.notification.model.NotificationType;
import com.footballverse.notification.service.MentionService;
import com.footballverse.notification.service.NotificationService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForumThreadService {

    private final ForumCategoryRepository categories;
    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumPostLikeRepository forumPostLikeRepository;
    private final ForumThreadFollowRepository follows;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final MentionService mentionService;

    @Transactional(readOnly = true)
    public List<ForumCategoryResponse> categories() {
        return categories.findAll().stream()
                .sorted(Comparator.comparing((ForumCategory c) -> "others".equals(c.getSlug())).thenComparing(ForumCategory::getId))
                .map(this::toCategory)
                .toList();
    }

    @Transactional
    public ForumCategoryResponse createCategory(ForumCategoryRequest request) {
        return toCategory(categories.save(new ForumCategory(request.name(), SlugUtil.slug(request.name()))));
    }

    @Transactional(readOnly = true)
    public PageResponse<ThreadResponse> threads(String categorySlug, int page, int size, String sort) {
        var pageable = PageRequest.of(page, size);
        var result = switch (sort == null ? "latest" : sort) {
            case "top" -> threads.topThreads(categorySlug, pageable);
            case "hot" -> threads.hotThreads(categorySlug, pageable);
            default -> threads.findByCategorySlugAndHiddenFalseOrderByPinnedDescLastActivityAtDesc(categorySlug, pageable);
        };
        return PageResponse.from(result.map(this::toThread));
    }

    @Transactional(readOnly = true)
    public ThreadDetailResponse thread(String slug) {
        ForumThread thread = threads.findBySlugAndHiddenFalse(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        return new ThreadDetailResponse(
                toThread(thread),
                posts.findByThreadIdAndHiddenFalseOrderByCreatedAtAsc(thread.getId()).stream().map(this::toPost).toList()
        );
    }

    @Transactional
    public ThreadResponse createThread(String categorySlug, ThreadRequest request) {
        UserAccount user = currentUser.get();
        ForumCategory category = categories.findBySlug(categorySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Forum category not found"));
        ForumThread thread = new ForumThread();
        thread.setTitle(request.title());
        thread.setSlug(SlugUtil.uniqueSlug(request.title()));
        thread.setCategory(category);
        thread.setAuthor(user);
        thread.setLastActivityAt(Instant.now());
        ForumThread saved = threads.save(thread);

        ForumPost post = new ForumPost();
        post.setThread(saved);
        post.setAuthor(user);
        post.setContent(sanitizer.sanitize(request.content()));
        posts.save(post);
        follows.save(new ForumThreadFollow(saved, user));
        mentionService.processMentions(user, request.content(), "%s mentioned you in a thread", "/forum/threads/" + saved.getSlug());
        return toThread(saved);
    }

    @Transactional
    public ThreadResponse pin(Long id, boolean pinned) {
        ForumThread thread = threadById(id);
        thread.setPinned(pinned);
        return toThread(thread);
    }

    @Transactional
    public ThreadResponse lock(Long id, boolean locked) {
        ForumThread thread = threadById(id);
        thread.setLocked(locked);
        if (locked) {
            notifications.create(thread.getAuthor(), NotificationType.THREAD_LOCKED, "Your thread was locked", "/forum/threads/" + thread.getSlug());
        }
        return toThread(thread);
    }

    @Transactional
    public ThreadResponse hideThread(Long id, boolean hidden) {
        ForumThread thread = threadById(id);
        thread.setHidden(hidden);
        return toThread(thread);
    }

    @Transactional
    public boolean toggleFollow(Long threadId) {
        UserAccount user = currentUser.get();
        ForumThread thread = threadById(threadId);
        return follows.findByThreadIdAndUserId(threadId, user.getId())
                .map(follow -> {
                    follows.delete(follow);
                    return false;
                })
                .orElseGet(() -> {
                    follows.save(new ForumThreadFollow(thread, user));
                    return true;
                });
    }

    @Transactional(readOnly = true)
    public List<ThreadResponse> followedThreads() {
        UserAccount current = currentUser.get();
        log.info("[ForumThreadService] Fetching followed threads for user: id={}, username={}", current.getId(), current.getUsername());
        List<ForumThreadFollow> userFollows = follows.findByUserOrderByThreadLastActivityAtDesc(current);
        return userFollows.stream()
                .map(ForumThreadFollow::getThread)
                .filter(thread -> !thread.isHidden())
                .map(this::toThread)
                .toList();
    }

    @Transactional
    public ThreadResponse markBestAnswer(Long threadId, Long postId) {
        ForumThread thread = threadById(threadId);
        UserAccount user = currentUser.get();
        if (!canManageAnswer(thread, user)) {
            throw new BadRequestException("Only the thread author or moderators can mark best answer");
        }
        ForumPost post = posts.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!post.getThread().getId().equals(thread.getId()) || post.isHidden()) {
            throw new BadRequestException("Best answer must be a visible post in the same thread");
        }
        thread.setBestAnswer(post);
        thread.setSolved(true);
        return toThread(thread);
    }

    @Transactional
    public ThreadResponse clearBestAnswer(Long threadId) {
        ForumThread thread = threadById(threadId);
        UserAccount user = currentUser.get();
        if (!canManageAnswer(thread, user)) {
            throw new BadRequestException("Only the thread author or moderators can clear best answer");
        }
        thread.setBestAnswer(null);
        thread.setSolved(false);
        return toThread(thread);
    }

    public ForumThread threadById(Long id) {
        return threads.findById(id).orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
    }

    public ThreadResponse toThread(ForumThread thread) {
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
                followed(thread),
                posts.countByThreadIdAndHiddenFalse(thread.getId()),
                forumPostLikeRepository.countByThreadId(thread.getId()),
                thread.getLastActivityAt()
        );
    }

    private boolean followed(ForumThread thread) {
        UserAccount current = currentUser.getOrNull();
        return current != null && follows.existsByThreadIdAndUserId(thread.getId(), current.getId());
    }

    private boolean canManageAnswer(ForumThread thread, UserAccount user) {
        return thread.getAuthor().getId().equals(user.getId())
                || user.getRoles().contains(UserRole.ADMIN)
                || user.getRoles().contains(UserRole.MODERATOR);
    }

    private ForumCategoryResponse toCategory(ForumCategory category) {
        return new ForumCategoryResponse(category.getId(), category.getName(), category.getSlug());
    }

    private PostResponse toPost(ForumPost post) {
        long likeCount = forumPostLikeRepository.countByPostId(post.getId());
        UserAccount current = currentUser.getOrNull();
        boolean liked = current != null && forumPostLikeRepository.existsByPostIdAndUserId(post.getId(), current.getId());

        return new PostResponse(
                post.getId(),
                post.getAuthor().getUsername(),
                post.getContent(),
                post.getCreatedAt(),
                likeCount,
                liked
        );
    }
}
