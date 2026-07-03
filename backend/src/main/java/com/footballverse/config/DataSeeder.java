package com.footballverse.config;

import com.footballverse.forum.ForumCategory;
import com.footballverse.forum.ForumCategoryRepository;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticle;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsCategory;
import com.footballverse.news.NewsCategoryRepository;
import com.footballverse.news.NewsSource;
import com.footballverse.news.NewsSourceRepository;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import com.footballverse.user.UserProfile;
import com.footballverse.user.UserProfileRepository;
import com.footballverse.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final UserAccountRepository users;
    private final UserProfileRepository profiles;
    private final NewsCategoryRepository newsCategories;
    private final NewsArticleRepository newsArticles;
    private final ForumCategoryRepository forumCategories;
    private final PasswordEncoder passwordEncoder;
    private final NewsSourceRepository newsSources;

    @Value("${app.seed.enabled}")
    private boolean enabled;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        UserAccount admin = seedAdmin();
        seedNewsCategory("Transfers", "transfers");
        seedNewsCategory("Matchday", "matchday");
        seedArticle(admin);
        seedForumCategory("Premier League", "premier-league");
        seedForumCategory("Transfers", "transfers");
        seedForumCategory("General Football", "general-football");
        seedNewsSource("ESPN Soccer", "https://www.espn.com/espn/rss/soccer/news");
        seedNewsSource("BBC Sport Football", "https://feeds.bbci.co.uk/sport/football/rss.xml");
        seedNewsSource("Thể thao 247", "https://thethao247.vn/bong-da.rss");
        seedNewsSource("Bóng đá 24h", "https://bongda24h.vn/RSS/1.rss");
        seedNewsSource("Goal.com", "https://www.goal.com/feeds/en/news");
        seedNewsSource("Transfermarkt", "https://www.transfermarkt.co.uk/rss/news");
        seedNewsSource("Tribuna.com", "https://tribuna.com/rss/news");
    }

    private UserAccount seedAdmin() {
        if (users.existsByEmail(adminEmail)) {
            return users.findByEmail(adminEmail).orElseThrow();
        }
        UserAccount admin = new UserAccount(adminEmail, "admin", passwordEncoder.encode(adminPassword));
        admin.setRoles(Set.of(UserRole.ADMIN));
        UserAccount saved = users.save(admin);
        profiles.save(new UserProfile(saved, "Admin"));
        return saved;
    }

    private void seedNewsCategory(String name, String slug) {
        newsCategories.findBySlug(slug).orElseGet(() -> newsCategories.save(new NewsCategory(name, slug)));
    }

    private void seedForumCategory(String name, String slug) {
        forumCategories.findBySlug(slug).orElseGet(() -> forumCategories.save(new ForumCategory(name, slug)));
    }

    private void seedArticle(UserAccount admin) {
        if (newsArticles.existsBySlug("opening-whistle")) {
            return;
        }
        NewsCategory category = newsCategories.findBySlug("matchday")
                .orElseGet(() -> newsCategories.save(new NewsCategory("Matchday", "matchday")));

        NewsArticle article = new NewsArticle();
        article.setTitle("Opening whistle: Football Verse newsroom is live");
        article.setSlug("opening-whistle");
        article.setSummary("A first seeded story so the Phase 1 news page is not empty.");
        article.setContent("<p>Football Verse now has public news, forum rooms, login, registration, and an admin control room wired to the Spring API.</p>");
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setCategory(category);
        article.setAuthor(admin);
        article.setPublishedAt(Instant.now());
        newsArticles.save(article);
    }

    private void seedNewsSource(String name, String feedUrl) {
        if (!newsSources.existsByFeedUrl(feedUrl)) {
            newsSources.save(new NewsSource(name, feedUrl));
        }
    }
}
