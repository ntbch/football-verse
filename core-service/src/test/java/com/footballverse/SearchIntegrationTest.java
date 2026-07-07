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
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.crawl.startup-enabled=false",
    "app.upload.dir=target/test-uploads"
})
@Transactional
public class SearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private NewsArticleRepository articles;

    @Autowired
    private ForumCategoryRepository categories;

    @Autowired
    private ForumThreadRepository threads;

    @Autowired
    private ForumPostRepository posts;

    private UserAccount testUser;
    private ForumCategory category;

    @BeforeEach
    void setUp() {
        testUser = users.save(new UserAccount(UUID.randomUUID() + "@user.local", "searcherUser", "pass"));
        category = categories.save(new ForumCategory("Tactic Discussion", "tactic-discussion"));
    }

    @Test
    void testSearchArticlesAndThreadsSuccess() throws Exception {
        String keyword = "kante";

        // 1. Setup matching News Article
        NewsArticle article = new NewsArticle();
        article.setTitle("Kante makes a stunning recovery");
        article.setSlug("kante-makes-recovery");
        article.setContent("The midfielder played exceptionally well today.");
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setAuthor(testUser);
        articles.save(article);

        // 2. Setup matching Forum Thread
        ForumThread thread = new ForumThread();
        thread.setTitle("Is Kante the best midfielder ever?");
        thread.setSlug("is-kante-the-best");
        thread.setCategory(category);
        thread.setAuthor(testUser);
        thread.setPinned(false);
        thread.setLocked(false);
        thread.setHidden(false);
        ForumThread savedThread = threads.save(thread);

        ForumPost post = new ForumPost();
        post.setThread(savedThread);
        post.setAuthor(testUser);
        post.setContent("I think he is absolutely tireless.");
        post.setHidden(false);
        posts.save(post);

        // 3. GET /uploads/search (or /search since servlet path is context-path and mockMvc calls mappings directly)
        mockMvc.perform(get("/search")
                        .param("q", keyword))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.news.content").isArray())
                .andExpect(jsonPath("$.data.news.content[0].title").value("Kante makes a stunning recovery"))
                .andExpect(jsonPath("$.data.forum.content").isArray())
                .andExpect(jsonPath("$.data.forum.content[0].title").value("Is Kante the best midfielder ever?"));
    }
}
