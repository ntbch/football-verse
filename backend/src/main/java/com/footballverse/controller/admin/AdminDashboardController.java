package com.footballverse.controller.admin;

import com.footballverse.common.response.ApiResponse;
import com.footballverse.news.ArticleStatus;
import com.footballverse.news.NewsArticleRepository;
import com.footballverse.news.NewsSourceRepository;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminDashboardController {
    private final UserAccountRepository userRepository;
    private final NewsArticleRepository articleRepository;
    private final NewsSourceRepository newsSourceRepository;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(Map.of(
            "totalUsers", userRepository.count(),
            "publishedArticles", articleRepository.countByStatus(ArticleStatus.PUBLISHED),
            "draftArticles", articleRepository.countByStatus(ArticleStatus.DRAFT),
            "archivedArticles", articleRepository.countByStatus(ArticleStatus.ARCHIVED),
            "newsSourcesCount", newsSourceRepository.count()
        ));
    }

    @GetMapping("/user-growth")
    public ApiResponse<List<Map<String, Object>>> getUserGrowth() {
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        List<UserAccount> allUsers = userRepository.findAll();
        
        Map<LocalDate, Long> growth = allUsers.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(weekAgo))
                .collect(Collectors.groupingBy(
                        u -> u.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate(),
                        TreeMap::new,
                        Collectors.counting()
                ));

        // If less than 7 dates are present, fill in missing dates with 0 to make chart rendering smooth
        for (int i = 0; i < 7; i++) {
            LocalDate date = LocalDate.now().minusDays(i);
            growth.putIfAbsent(date, 0L);
        }

        List<Map<String, Object>> growthData = growth.entrySet().stream()
                .map(entry -> Map.<String, Object>of(
                        "date", entry.getKey().toString(),
                        "count", entry.getValue()
                ))
                .sorted((a, b) -> ((String) a.get("date")).compareTo((String) b.get("date")))
                .collect(Collectors.toList());

        return ApiResponse.ok(growthData);
    }
}
