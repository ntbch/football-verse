package com.footballverse;

import com.footballverse.forum.ForumCategory;
import com.footballverse.forum.ForumCategoryRepository;
import com.footballverse.forum.ForumService;
import com.footballverse.forum.ForumThread;
import com.footballverse.forum.ForumThreadRepository;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.forum.dto.ThreadRequest;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsCommentService;
import com.footballverse.news.dto.CommentRequest;
import com.footballverse.notification.Notification;
import com.footballverse.notification.NotificationRepository;
import com.footballverse.notification.NotificationType;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
public class MentionIntegrationTest {

    @Autowired
    private ForumService forumService;

    @Autowired
    private NewsCommentService newsCommentService;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private ForumCategoryRepository categories;

    @Autowired
    private ForumThreadRepository threads;

    @Autowired
    private NewsArticleRepository articles;

    @Autowired
    private NotificationRepository notifications;

    @MockBean
    private CurrentUser currentUser;

    private UserAccount author;
    private UserAccount userAlice;
    private UserAccount userBob;
    private ForumCategory category;
    private NewsArticle article;

    @BeforeEach
    void setUp() {
        author = users.save(new UserAccount(UUID.randomUUID() + "@user.local", "authorUser", "pass"));
        userAlice = users.save(new UserAccount(UUID.randomUUID() + "@alice.local", "alice", "pass"));
        userBob = users.save(new UserAccount(UUID.randomUUID() + "@bob.local", "bob", "pass"));
        when(currentUser.get()).thenReturn(author);

        category = categories.save(new ForumCategory("General", "general"));
        
        NewsArticle articleEntity = new NewsArticle();
        articleEntity.setTitle("Super Match");
        articleEntity.setSlug("super-match");
        articleEntity.setContent("Kick off details.");
        articleEntity.setStatus(ArticleStatus.PUBLISHED);
        articleEntity.setAuthor(author);
        article = articles.save(articleEntity);
    }

    @Test
    void testForumThreadCreationMentions() {
        ThreadRequest request = new ThreadRequest("Hot Topic", "Hey @alice and @bob, what do you think? Also check @authorUser self-mention.");
        forumService.createThread("general", request);

        // Verify notifications for alice
        List<Notification> aliceNotes = notifications.findByUserOrderByCreatedAtDesc(userAlice);
        assertThat(aliceNotes).hasSize(1);
        assertThat(aliceNotes.get(0).getType()).isEqualTo(NotificationType.FORUM_MENTION);
        assertThat(aliceNotes.get(0).getMessage()).contains("authorUser mentioned you in a thread");

        // Verify notifications for bob
        List<Notification> bobNotes = notifications.findByUserOrderByCreatedAtDesc(userBob);
        assertThat(bobNotes).hasSize(1);
        assertThat(bobNotes.get(0).getType()).isEqualTo(NotificationType.FORUM_MENTION);
        assertThat(bobNotes.get(0).getMessage()).contains("authorUser mentioned you in a thread");

        // Verify no notification for self-mention
        List<Notification> selfNotes = notifications.findByUserOrderByCreatedAtDesc(author);
        assertThat(selfNotes).isEmpty();
    }

    @Test
    void testForumReplyMentions() {
        // Create base thread first
        ForumThread thread = new ForumThread();
        thread.setTitle("Discussion");
        thread.setSlug("discussion");
        thread.setCategory(category);
        thread.setAuthor(userBob); // Thread owned by Bob
        ForumThread savedThread = threads.save(thread);

        // Author user replies and mentions Alice
        ReplyRequest replyRequest = new ReplyRequest("Check this out @alice!");
        forumService.reply(savedThread.getId(), replyRequest);

        // Verify Alice gets a FORUM_MENTION
        List<Notification> aliceNotes = notifications.findByUserOrderByCreatedAtDesc(userAlice);
        assertThat(aliceNotes).hasSize(1);
        assertThat(aliceNotes.get(0).getType()).isEqualTo(NotificationType.FORUM_MENTION);
        assertThat(aliceNotes.get(0).getMessage()).contains("authorUser mentioned you in a forum post");

        // Verify Bob gets a FORUM_REPLY (because he is the thread author) but not a MENTION
        List<Notification> bobNotes = notifications.findByUserOrderByCreatedAtDesc(userBob);
        assertThat(bobNotes).hasSize(1);
        assertThat(bobNotes.get(0).getType()).isEqualTo(NotificationType.FORUM_REPLY);
    }

    @Test
    void testNewsCommentMentions() {
        CommentRequest commentRequest = new CommentRequest(null, "Good article @alice!");
        newsCommentService.comment(article.getId(), commentRequest);

        // Verify Alice gets a FORUM_MENTION
        List<Notification> aliceNotes = notifications.findByUserOrderByCreatedAtDesc(userAlice);
        assertThat(aliceNotes).hasSize(1);
        assertThat(aliceNotes.get(0).getType()).isEqualTo(NotificationType.FORUM_MENTION);
        assertThat(aliceNotes.get(0).getMessage()).contains("authorUser mentioned you in a comment");
        assertThat(aliceNotes.get(0).getLinkUrl()).isEqualTo("/news/super-match");
    }

    @Test
    void testNonExistentUserMention() {
        long before = notifications.count();
        CommentRequest commentRequest = new CommentRequest(null, "Hello @nonexistentuser!");
        newsCommentService.comment(article.getId(), commentRequest);
        assertThat(notifications.count()).isEqualTo(before);
    }
}
