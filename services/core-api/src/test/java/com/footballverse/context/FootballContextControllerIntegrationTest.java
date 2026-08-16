package com.footballverse.context;

import com.footballverse.context.model.FootballContext;
import com.footballverse.context.repository.FootballContextRepository;
import com.footballverse.forum.model.ForumCategory;
import com.footballverse.forum.model.ForumThread;
import com.footballverse.forum.repository.ForumCategoryRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.news.model.ArticleStatus;
import com.footballverse.news.model.NewsArticle;
import com.footballverse.news.repository.NewsArticleRepository;
import com.footballverse.prediction.model.Fixture;
import com.footballverse.prediction.repository.FixtureRepository;
import com.footballverse.security.JwtService;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserRole;
import com.footballverse.user.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.crawl.startup-enabled=false")
@Transactional
class FootballContextControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FixtureRepository fixtures;

    @Autowired
    private FootballContextRepository contexts;

    @Autowired
    private NewsArticleRepository articles;

    @Autowired
    private ForumCategoryRepository categories;

    @Autowired
    private ForumThreadRepository threads;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private JwtService jwtService;

    @Test
    void returnsTheCanonicalFixtureContextByProviderFixtureId() throws Exception {
        Fixture fixture = new Fixture();
        fixture.setFixtureId("provider-fixture-context-456");
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Manchester City");
        fixture.setAwayTeam("Arsenal");
        fixture.setKickoff(Instant.parse("2026-08-20T14:00:00Z"));
        fixture = fixtures.saveAndFlush(fixture);
        contexts.saveAndFlush(FootballContext.fixture(fixture, "Manchester City vs Arsenal"));

        mockMvc.perform(get("/contexts/fixtures/{fixtureId}", fixture.getFixtureId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.context.type").value("FIXTURE"))
                .andExpect(jsonPath("$.data.context.key").value("provider-fixture-context-456"))
                .andExpect(jsonPath("$.data.context.displayName").value("Manchester City vs Arsenal"))
                .andExpect(jsonPath("$.data.news").isArray())
                .andExpect(jsonPath("$.data.threads").isArray());
    }

    @Test
    void returnsOnlyPublishedNewsAndVisibleThreadsLinkedToTheFixtureContext() throws Exception {
        Fixture fixture = fixture("provider-fixture-context-789");
        FootballContext context = contexts.saveAndFlush(FootballContext.fixture(fixture, "Liverpool vs Chelsea"));
        UserAccount author = users.saveAndFlush(new UserAccount(UUID.randomUUID() + "@user.local", "contextAuthor", "pass"));
        ForumCategory category = categories.saveAndFlush(new ForumCategory("Match chat", "match-chat"));

        NewsArticle linkedArticle = article("liverpool-chelsea-preview", "Liverpool Chelsea preview", author);
        linkedArticle.getContexts().add(context);
        articles.saveAndFlush(linkedArticle);
        articles.saveAndFlush(article("unrelated-preview", "Unrelated preview", author));

        ForumThread linkedThread = thread("liverpool-chelsea-discussion", "Liverpool Chelsea discussion", author, category);
        linkedThread.setContext(context);
        threads.saveAndFlush(linkedThread);
        threads.saveAndFlush(thread("unrelated-discussion", "Unrelated discussion", author, category));

        mockMvc.perform(get("/contexts/fixtures/{fixtureId}", fixture.getFixtureId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.news.length()").value(1))
                .andExpect(jsonPath("$.data.news[0].slug").value("liverpool-chelsea-preview"))
                .andExpect(jsonPath("$.data.threads.length()").value(1))
                .andExpect(jsonPath("$.data.threads[0].slug").value("liverpool-chelsea-discussion"));
    }

    @Test
    void adminCanSetExplicitArticleAndThreadContexts() throws Exception {
        Fixture fixture = fixture("provider-fixture-context-999");
        FootballContext context = contexts.saveAndFlush(FootballContext.fixture(fixture, "Tottenham vs Newcastle"));
        UserAccount author = users.saveAndFlush(new UserAccount(UUID.randomUUID() + "@user.local", "contextAdminAuthor", "pass"));
        UserAccount admin = new UserAccount(UUID.randomUUID() + "@admin.local", "contextAdmin", "pass");
        admin.setRoles(Set.of(UserRole.ADMIN));
        String adminToken = jwtService.createAccessToken(users.saveAndFlush(admin));
        NewsArticle article = articles.saveAndFlush(article("spurs-newcastle-preview", "Spurs Newcastle preview", author));
        ForumCategory category = categories.saveAndFlush(new ForumCategory("Premier League", "premier-league-chat"));
        ForumThread thread = threads.saveAndFlush(thread("spurs-newcastle-chat", "Spurs Newcastle chat", author, category));

        mockMvc.perform(put("/admin/news/{articleId}/contexts", article.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("{\"contextIds\":[" + context.getId() + "]}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/admin/forum/threads/{threadId}/context", thread.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("{\"contextId\":" + context.getId() + "}"))
                .andExpect(status().isOk());

        assertThat(articles.findById(article.getId()).orElseThrow().getContexts())
                .extracting(FootballContext::getId)
                .containsExactly(context.getId());
        assertThat(threads.findById(thread.getId()).orElseThrow().getContext().getId()).isEqualTo(context.getId());
    }

    private Fixture fixture(String providerFixtureId) {
        Fixture fixture = new Fixture();
        fixture.setFixtureId(providerFixtureId);
        fixture.setLeagueSlug("premier-league");
        fixture.setHomeTeam("Liverpool");
        fixture.setAwayTeam("Chelsea");
        fixture.setKickoff(Instant.parse("2026-08-20T14:00:00Z"));
        return fixtures.saveAndFlush(fixture);
    }

    private static NewsArticle article(String slug, String title, UserAccount author) {
        NewsArticle article = new NewsArticle();
        article.setSlug(slug);
        article.setTitle(title);
        article.setContent(title);
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setAuthor(author);
        return article;
    }

    private static ForumThread thread(String slug, String title, UserAccount author, ForumCategory category) {
        ForumThread thread = new ForumThread();
        thread.setSlug(slug);
        thread.setTitle(title);
        thread.setAuthor(author);
        thread.setCategory(category);
        thread.setLastActivityAt(Instant.parse("2026-08-20T14:00:00Z"));
        return thread;
    }
}
