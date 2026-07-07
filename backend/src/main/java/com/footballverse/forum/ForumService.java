package com.footballverse.forum;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.security.CurrentUser;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.common.text.SlugUtil;
import com.footballverse.forum.dto.ForumCategoryRequest;
import com.footballverse.forum.dto.ForumCategoryResponse;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.forum.dto.ReportRequest;
import com.footballverse.forum.dto.ReportResponse;
import com.footballverse.forum.dto.ThreadDetailResponse;
import com.footballverse.forum.dto.ThreadRequest;
import com.footballverse.forum.dto.ThreadResponse;
import com.footballverse.notification.NotificationService;
import com.footballverse.notification.NotificationType;
import com.footballverse.notification.MentionService;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ForumService {
    private final ForumCategoryRepository categories;
    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumReportRepository reports;
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
    public PostResponse reply(Long threadId, ReplyRequest request) {
        UserAccount user = currentUser.get();
        ForumThread thread = threads.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        if (thread.isLocked()) {
            throw new BadRequestException("Thread is locked");
        }
        ForumPost post = new ForumPost();
        post.setThread(thread);
        post.setAuthor(user);
        post.setContent(sanitizer.sanitize(request.content()));
        ForumPost saved = posts.save(post);
        thread.setLastActivityAt(Instant.now());
        mentionService.processMentions(user, request.content(), "%s mentioned you in a forum post", "/forum/threads/" + thread.getSlug());
        notifyReplySubscribers(thread, user);
        return toPost(saved);
    }

    @Transactional
    public ReportResponse report(ReportRequest request) {
        validateReportTarget(request.targetType(), request.targetId());
        ForumReport report = new ForumReport();
        report.setReporter(currentUser.get());
        report.setTargetType(request.targetType());
        report.setTargetId(request.targetId());
        report.setReason(sanitizer.sanitize(request.reason()));
        return toReport(reports.save(report));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> openReports() {
        return reports.findByStatusOrderByCreatedAtDesc(ForumReportStatus.OPEN).stream().map(this::toReport).toList();
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
    public PostResponse hidePost(Long id, boolean hidden) {
        ForumPost post = posts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        post.setHidden(hidden);
        if (hidden && post.getThread().getBestAnswer() != null && post.getThread().getBestAnswer().getId().equals(post.getId())) {
            post.getThread().setBestAnswer(null);
            post.getThread().setSolved(false);
        }
        return toPost(post);
    }

    @Transactional
    public ReportResponse resolveReport(Long id) {
        ForumReport report = reports.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        report.setStatus(ForumReportStatus.RESOLVED);
        notifications.create(report.getReporter(), NotificationType.REPORT_RESOLVED, "Your report was resolved", reportLink(report));
        return toReport(report);
    }

    private ForumThread threadById(Long id) {
        return threads.findById(id).orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
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
        return follows.findByUserOrderByThreadLastActivityAtDesc(currentUser.get()).stream()
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

    private boolean canManageAnswer(ForumThread thread, UserAccount user) {
        return thread.getAuthor().getId().equals(user.getId())
                || user.getRoles().contains(UserRole.ADMIN)
                || user.getRoles().contains(UserRole.MODERATOR);
    }

    private void notifyReplySubscribers(ForumThread thread, UserAccount replier) {
        Set<Long> notified = new HashSet<>();
        String link = "/forum/threads/" + thread.getSlug();
        String message = replier.getUsername() + " replied to " + thread.getTitle();
        if (!thread.getAuthor().getId().equals(replier.getId())) {
            notifications.create(thread.getAuthor(), NotificationType.FORUM_REPLY, message, link);
            notified.add(thread.getAuthor().getId());
        }
        follows.findByThreadId(thread.getId()).forEach(follow -> {
            UserAccount user = follow.getUser();
            if (!user.getId().equals(replier.getId()) && notified.add(user.getId())) {
                notifications.create(user, NotificationType.FORUM_REPLY, message, link);
            }
        });
    }

    private void validateReportTarget(ForumReportTarget targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case THREAD -> threads.existsById(targetId);
            case POST -> posts.existsById(targetId);
        };
        if (!exists) {
            throw new ResourceNotFoundException(targetType == ForumReportTarget.THREAD ? "Thread not found" : "Post not found");
        }
    }

    private String reportLink(ForumReport report) {
        return switch (report.getTargetType()) {
            case THREAD -> threads.findById(report.getTargetId())
                    .map(thread -> "/forum/threads/" + thread.getSlug())
                    .orElse("/profile");
            case POST -> posts.findById(report.getTargetId())
                    .map(post -> "/forum/threads/" + post.getThread().getSlug())
                    .orElse("/profile");
        };
    }

    private ForumCategoryResponse toCategory(ForumCategory category) {
        return new ForumCategoryResponse(category.getId(), category.getName(), category.getSlug());
    }

    private ThreadResponse toThread(ForumThread thread) {
        return new ThreadResponse(
                thread.getId(),
                thread.getTitle(),
                thread.getSlug(),
                thread.getCategory().getName(),
                thread.getAuthor().getUsername(),
                thread.isPinned(),
                thread.isLocked(),
                thread.getCreatedAt(),
                thread.isSolved(),
                thread.getBestAnswer() == null ? null : thread.getBestAnswer().getId(),
                followed(thread),
                posts.countByThreadIdAndHiddenFalse(thread.getId()),
                thread.getLastActivityAt()
        );
    }

    private boolean followed(ForumThread thread) {
        UserAccount current = currentUser.getOrNull();
        return current != null && follows.existsByThreadIdAndUserId(thread.getId(), current.getId());
    }

    public boolean toggleLikePost(Long postId) {
        UserAccount user = currentUser.get();
        ForumPost post = posts.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        return forumPostLikeRepository.findByPostIdAndUserId(postId, user.getId())
                .map(like -> {
                    forumPostLikeRepository.delete(like);
                    return false;
                })
                .orElseGet(() -> {
                    forumPostLikeRepository.save(new ForumPostLike(post, user));
                    return true;
                });
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

    private ReportResponse toReport(ForumReport report) {
        return new ReportResponse(
                report.getId(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReporter().getUsername(),
                report.getReason(),
                report.getStatus()
        );
    }
}
