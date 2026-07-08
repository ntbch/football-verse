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
import com.footballverse.news.NewsSourceType;
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

    @Value("${app.seed.moderator-email}")
    private String moderatorEmail;

    @Value("${app.seed.moderator-password}")
    private String moderatorPassword;

    @Value("${app.seed.news-sources:}")
    private String newsSourceSeeds;

    @Value("${app.seed.news-categories:}")
    private String newsCategorySeeds;

    @Value("${app.seed.forum-categories:}")
    private String forumCategorySeeds;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        UserAccount admin = seedAdmin();
        seedModerator();
        seedNewsCategories();
        seedArticle(admin);
        seedForumCategories();
        seedNewsSources();
        seedCustomNewsSources();
    }

    private void seedCustomNewsSources() {
        // Sitemap source: Football Italia
        String sitemapUrl = "https://football-italia.net/post-sitemap.xml";
        if (!newsSources.existsByFeedUrl(sitemapUrl) && !newsSources.existsByName("Football Italia")) {
            NewsSource source = new NewsSource("Football Italia", sitemapUrl);
            source.setSourceType(NewsSourceType.SITEMAP);
            newsSources.save(source);
        }

        // Sitemap source: Goal.com (Google News XML)
        String goalSitemapUrl = "https://www.goal.com/en/sitemap/google-news.xml";
        if (!newsSources.existsByFeedUrl(goalSitemapUrl) && !newsSources.existsByName("Goal.com")) {
            NewsSource source = new NewsSource("Goal.com", goalSitemapUrl);
            source.setSourceType(NewsSourceType.SITEMAP);
            newsSources.save(source);
        }

        // Homepage scrape source: Sky Sports Football
        String homepageUrl = "https://www.skysports.com/football";
        if (!newsSources.existsByFeedUrl(homepageUrl) && !newsSources.existsByName("Sky Sports Football")) {
            NewsSource source = new NewsSource("Sky Sports Football", homepageUrl);
            source.setSourceType(NewsSourceType.HOMEPAGE);
            source.setCssSelector(".sdc-site-tile__headline a");
            newsSources.save(source);
        }
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

    private UserAccount seedModerator() {
        if (users.existsByEmail(moderatorEmail)) {
            return users.findByEmail(moderatorEmail).orElseThrow();
        }
        UserAccount moderator = new UserAccount(moderatorEmail, "moderator", passwordEncoder.encode(moderatorPassword));
        moderator.setRoles(Set.of(UserRole.MODERATOR));
        UserAccount saved = users.save(moderator);
        profiles.save(new UserProfile(saved, "Moderator"));
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
        NewsCategory category = newsCategories.findBySlug("league-tournament-news")
                .orElseGet(() -> newsCategories.save(new NewsCategory("League News", "league-tournament-news")));

        NewsArticle article = new NewsArticle();
        article.setTitle("Opening whistle: Football Verse newsroom is live");
        article.setSlug("opening-whistle");
        article.setSummary("A first seeded story so the Phase 1 news page is not empty.");
        article.setContent(
                "<p>Football Verse now has public news, forum rooms, login, registration, and an admin control room wired to the Spring API.</p>");
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setCategory(category);
        article.setAuthor(admin);
        article.setPublishedAt(Instant.now());
        newsArticles.save(article);
    }

    private void seedNewsSource(String name, String feedUrl) {
        if (!newsSources.existsByFeedUrl(feedUrl) && !newsSources.existsByName(name)) {
            newsSources.save(new NewsSource(name, feedUrl));
        }
    }

    private void seedNewsSources() {
        forEachSeed(newsSourceSeeds, this::seedNewsSource);
    }

    private void seedNewsCategories() {
        forEachSeed(newsCategorySeeds, this::seedNewsCategory);
    }

    private void seedForumCategories() {
        forEachSeed(forumCategorySeeds, this::seedForumCategory);
    }

    private void forEachSeed(String seeds, SeedConsumer consumer) {
        if (seeds == null || seeds.isBlank())
            return;
        for (String seed : seeds.split(";")) {
            String[] parts = seed.split("=", 2);
            if (parts.length == 2 && !parts[0].isBlank() && !parts[1].isBlank()) {
                consumer.accept(parts[0].trim(), parts[1].trim());
            }
        }
    }

    @FunctionalInterface
    private interface SeedConsumer {
        void accept(String name, String value);
    }
}
