package com.footballverse;

import com.footballverse.forum.ForumCategory;
import com.footballverse.forum.ForumCategoryRepository;
import com.footballverse.forum.ForumPost;
import com.footballverse.forum.ForumPostRepository;
import com.footballverse.forum.ForumThread;
import com.footballverse.forum.ForumThreadRepository;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsCategory;
import com.footballverse.news.NewsCategoryRepository;
import com.footballverse.news.NewsComment;
import com.footballverse.news.NewsCommentRepository;
import com.footballverse.security.JwtService;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.crawl.startup-enabled=false"
})
@Transactional
public class LikesAndSseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private NewsCategoryRepository newsCategories;

    @Autowired
    private NewsArticleRepository newsArticles;

    @Autowired
    private NewsCommentRepository newsComments;

    @Autowired
    private ForumCategoryRepository forumCategories;

    @Autowired
    private ForumThreadRepository forumThreads;

    @Autowired
    private ForumPostRepository forumPosts;

    private UserAccount testUser;
    private String token;

    @BeforeEach
    void setUp() {
        testUser = users.save(new UserAccount(UUID.randomUUID() + "@user.local", "testuser", "pass"));
        token = jwtService.createAccessToken(testUser);
    }

    @Test
    void testNewsCommentLikingFlow() throws Exception {
        NewsCategory category = newsCategories.save(new NewsCategory("La Liga", "la-liga"));
        
        NewsArticle article = new NewsArticle();
        article.setTitle("Real Madrid wins");
        article.setSlug("real-madrid-wins");
        article.setContent("Hala Madrid!");
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setCategory(category);
        article.setAuthor(testUser);
        NewsArticle savedArticle = newsArticles.save(article);

        NewsComment comment = new NewsComment();
        comment.setArticle(savedArticle);
        comment.setAuthor(testUser);
        comment.setContent("Awesome win!");
        NewsComment savedComment = newsComments.save(comment);

        // 1. Check initial likes (should be 0)
        mockMvc.perform(get("/news/" + savedArticle.getSlug() + "/comments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].likeCount").value(0))
                .andExpect(jsonPath("$.data[0].liked").value(false));

        // 2. Toggle like - should return liked: true
        mockMvc.perform(post("/news/comments/" + savedComment.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liked").value(true));

        // 3. Verify comments response again (should be 1 and liked: true)
        mockMvc.perform(get("/news/" + savedArticle.getSlug() + "/comments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].likeCount").value(1))
                .andExpect(jsonPath("$.data[0].liked").value(true));

        // 4. Toggle like again - should return liked: false (unlike)
        mockMvc.perform(post("/news/comments/" + savedComment.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liked").value(false));

        // 5. Verify comments response (should be 0 and liked: false)
        mockMvc.perform(get("/news/" + savedArticle.getSlug() + "/comments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].likeCount").value(0))
                .andExpect(jsonPath("$.data[0].liked").value(false));
    }

    @Test
    void testForumPostLikingFlow() throws Exception {
        ForumCategory category = forumCategories.save(new ForumCategory("General Chat", "general-chat"));

        ForumThread thread = new ForumThread();
        thread.setTitle("Best player ever?");
        thread.setSlug("best-player-ever");
        thread.setCategory(category);
        thread.setAuthor(testUser);
        ForumThread savedThread = forumThreads.save(thread);

        ForumPost post = new ForumPost();
        post.setThread(savedThread);
        post.setAuthor(testUser);
        post.setContent("Lionel Messi for sure!");
        ForumPost savedPost = forumPosts.save(post);

        // 1. Check initial post details
        mockMvc.perform(get("/forum/threads/" + savedThread.getSlug())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts", hasSize(1)))
                .andExpect(jsonPath("$.data.posts[0].likeCount").value(0))
                .andExpect(jsonPath("$.data.posts[0].liked").value(false));

        // 2. Toggle like
        mockMvc.perform(post("/forum/posts/" + savedPost.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liked").value(true));

        // 3. Verify post details updated
        mockMvc.perform(get("/forum/threads/" + savedThread.getSlug())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts[0].likeCount").value(1))
                .andExpect(jsonPath("$.data.posts[0].liked").value(true));
    }

    @Test
    void testSseNotificationStreamAuthentication() throws Exception {
        // SSE request with valid token query parameter should return 200 TEXT_EVENT_STREAM
        mockMvc.perform(get("/api/v1/notifications/stream")
                        .param("token", token))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String contentType = result.getResponse().getContentType();
                    assert contentType != null && contentType.contains("text/event-stream");
                });

        // SSE request with invalid token should return 401 Unauthorized
        mockMvc.perform(get("/api/v1/notifications/stream")
                        .param("token", "invalid-token"))
                .andExpect(status().isUnauthorized());
    }
}
