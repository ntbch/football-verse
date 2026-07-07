package com.footballverse;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.forum.ForumCategory;
import com.footballverse.forum.ForumCategoryRepository;
import com.footballverse.forum.ForumPost;
import com.footballverse.forum.ForumPostRepository;
import com.footballverse.forum.ForumReportTarget;
import com.footballverse.forum.ForumService;
import com.footballverse.forum.ForumThread;
import com.footballverse.forum.ForumThreadRepository;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.notification.NotificationRepository;
import com.footballverse.notification.NotificationService;
import com.footballverse.notification.NotificationType;
import com.footballverse.forum.dto.ReportRequest;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
public class ForumModerationIntegrityTest {
    @Autowired
    private ForumService service;

    @Autowired
    private ForumCategoryRepository categories;

    @Autowired
    private ForumThreadRepository threads;

    @Autowired
    private ForumPostRepository posts;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @MockBean
    private CurrentUser currentUser;

    private UserAccount user;
    private ForumCategory category;
    private ForumThread thread;
    private ForumPost post;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString();
        user = users.saveAndFlush(new UserAccount(
                "forum-" + suffix + "@footballverse.local",
                "forum-" + suffix.substring(0, 12),
                "hash"
        ));
        when(currentUser.get()).thenReturn(user);

        category = categories.saveAndFlush(new ForumCategory("Moderation " + suffix, "moderation-" + suffix));
        thread = new ForumThread();
        thread.setTitle("Moderation thread");
        thread.setSlug("moderation-thread-" + suffix);
        thread.setCategory(category);
        thread.setAuthor(user);
        thread = threads.saveAndFlush(thread);

        post = new ForumPost();
        post.setThread(thread);
        post.setAuthor(user);
        post.setContent("Visible post");
        post = posts.saveAndFlush(post);
    }

    @Test
    void rejectsReportsForMissingTargets() {
        assertThatThrownBy(() -> service.report(new ReportRequest(ForumReportTarget.THREAD, -1L, "missing")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Thread not found");
        assertThatThrownBy(() -> service.report(new ReportRequest(ForumReportTarget.POST, -1L, "missing")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Post not found");
    }

    @Test
    void hidesAndRestoresThreadsAndPosts() {
        service.hidePost(post.getId(), true);
        assertThat(service.thread(thread.getSlug()).posts()).isEmpty();

        service.hidePost(post.getId(), false);
        assertThat(service.thread(thread.getSlug()).posts()).hasSize(1);

        service.hideThread(thread.getId(), true);
        assertThatThrownBy(() -> service.thread(thread.getSlug()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Thread not found");

        service.hideThread(thread.getId(), false);
        assertThat(service.thread(thread.getSlug()).thread().id()).isEqualTo(thread.getId());
    }

    @Test
    void marksBestAnswerAndClearsIt() {
        assertThat(service.markBestAnswer(thread.getId(), post.getId()).solved()).isTrue();
        assertThat(threads.findById(thread.getId()).orElseThrow().getBestAnswer().getId()).isEqualTo(post.getId());

        assertThat(service.clearBestAnswer(thread.getId()).solved()).isFalse();
        assertThat(threads.findById(thread.getId()).orElseThrow().getBestAnswer()).isNull();
    }

    @Test
    void rejectsBestAnswerFromNonAuthor() {
        UserAccount other = users.saveAndFlush(new UserAccount(
                "not-author-" + UUID.randomUUID() + "@footballverse.local",
                "notauthor" + UUID.randomUUID().toString().substring(0, 8),
                "hash"
        ));
        when(currentUser.get()).thenReturn(other);

        assertThatThrownBy(() -> service.markBestAnswer(thread.getId(), post.getId()))
                .isInstanceOf(com.footballverse.common.exception.BadRequestException.class)
                .hasMessage("Only the thread author or moderators can mark best answer");
    }

    @Test
    void followingThreadReceivesReplyNotification() {
        UserAccount follower = users.saveAndFlush(new UserAccount(
                "follower-" + UUID.randomUUID() + "@footballverse.local",
                "follower" + UUID.randomUUID().toString().substring(0, 8),
                "hash"
        ));
        UserAccount replier = users.saveAndFlush(new UserAccount(
                "replier-" + UUID.randomUUID() + "@footballverse.local",
                "replier" + UUID.randomUUID().toString().substring(0, 8),
                "hash"
        ));

        when(currentUser.get()).thenReturn(follower);
        assertThat(service.toggleFollow(thread.getId())).isTrue();

        when(currentUser.get()).thenReturn(replier);
        service.reply(thread.getId(), new ReplyRequest("New reply"));

        assertThat(notificationRepository.findByUserOrderByCreatedAtDesc(follower))
                .anySatisfy(notification -> assertThat(notification.getType()).isEqualTo(NotificationType.FORUM_REPLY));
    }

    @Test
    void topSortUsesReplyVolume() {
        ForumThread busy = new ForumThread();
        busy.setTitle("Busy thread");
        busy.setSlug("busy-thread-" + UUID.randomUUID());
        busy.setCategory(category);
        busy.setAuthor(user);
        busy = threads.saveAndFlush(busy);

        ForumPost busyPost = new ForumPost();
        busyPost.setThread(busy);
        busyPost.setAuthor(user);
        busyPost.setContent("More active");
        posts.saveAndFlush(busyPost);
        ForumPost busyReply = new ForumPost();
        busyReply.setThread(busy);
        busyReply.setAuthor(user);
        busyReply.setContent("Another reply");
        posts.saveAndFlush(busyReply);

        assertThat(service.threads(category.getSlug(), 0, 20, "top").content().getFirst().id()).isEqualTo(busy.getId());
    }

    @Test
    void resolvingReportNotifiesReporterWithTargetLink() {
        Long reportId = service.report(new ReportRequest(ForumReportTarget.POST, post.getId(), "spam")).id();

        service.resolveReport(reportId);

        assertThat(notificationService.mine())
                .anySatisfy(notification -> {
                    assertThat(notification.type()).isEqualTo(NotificationType.REPORT_RESOLVED);
                    assertThat(notification.linkUrl()).isEqualTo("/forum/threads/" + thread.getSlug());
                });
    }

    @Test
    void readsOnlyCurrentUsersNotifications() {
        UserAccount other = users.saveAndFlush(new UserAccount(
                "other-" + UUID.randomUUID() + "@footballverse.local",
                "other-" + UUID.randomUUID().toString().substring(0, 12),
                "hash"
        ));
        notificationService.create(user, NotificationType.SYSTEM_ANNOUNCEMENT, "Mine", "/profile");
        Long mineId = notificationRepository.findByUserOrderByCreatedAtDesc(user).getFirst().getId();

        when(currentUser.get()).thenReturn(other);

        assertThatThrownBy(() -> notificationService.read(mineId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Notification not found");

        notificationService.create(other, NotificationType.SYSTEM_ANNOUNCEMENT, "Other", "/profile");
        notificationService.readAll();

        assertThat(notificationRepository.findByUserOrderByCreatedAtDesc(user).getFirst().getReadAt()).isNull();
        assertThat(notificationRepository.findByUserOrderByCreatedAtDesc(other).getFirst().getReadAt()).isNotNull();
    }
}
