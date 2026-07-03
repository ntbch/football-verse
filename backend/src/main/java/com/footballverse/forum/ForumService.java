package com.footballverse.forum;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.common.security.CurrentUser;
import com.footballverse.common.text.RichTextSanitizer;
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
import com.footballverse.user.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ForumService {
    private final ForumCategoryRepository categories;
    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumReportRepository reports;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public List<ForumCategoryResponse> categories() {
        return categories.findAll().stream().map(this::toCategory).toList();
    }

    @Transactional
    public ForumCategoryResponse createCategory(ForumCategoryRequest request) {
        return toCategory(categories.save(new ForumCategory(request.name(), slug(request.name()))));
    }

    @Transactional(readOnly = true)
    public PageResponse<ThreadResponse> threads(String categorySlug, int page, int size) {
        return PageResponse.from(threads.findByCategorySlugAndHiddenFalseOrderByPinnedDescCreatedAtDesc(
                categorySlug,
                PageRequest.of(page, size)
        ).map(this::toThread));
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
        thread.setSlug(slug(request.title()) + "-" + System.currentTimeMillis());
        thread.setCategory(category);
        thread.setAuthor(user);
        ForumThread saved = threads.save(thread);

        ForumPost post = new ForumPost();
        post.setThread(saved);
        post.setAuthor(user);
        post.setContent(sanitizer.sanitize(request.content()));
        posts.save(post);
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
        if (!thread.getAuthor().getId().equals(user.getId())) {
            notifications.create(thread.getAuthor(), NotificationType.FORUM_REPLY, user.getUsername() + " replied to your thread", "/forum/threads/" + thread.getSlug());
        }
        return toPost(saved);
    }

    @Transactional
    public ReportResponse report(ReportRequest request) {
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
    public ReportResponse resolveReport(Long id) {
        ForumReport report = reports.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        report.setStatus(ForumReportStatus.RESOLVED);
        return toReport(report);
    }

    private ForumThread threadById(Long id) {
        return threads.findById(id).orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
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
                thread.getCreatedAt()
        );
    }

    private PostResponse toPost(ForumPost post) {
        return new PostResponse(post.getId(), post.getAuthor().getUsername(), post.getContent(), post.getCreatedAt());
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

    private String slug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
