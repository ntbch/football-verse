package com.footballverse.user.service;

import com.footballverse.billing.service.BillingService;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ForbiddenException;
import com.footballverse.news.service.NewsArticleService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.FollowTargetRequest;
import com.footballverse.user.dto.FollowTargetResponse;
import com.footballverse.user.dto.FollowingFeedItemResponse;
import com.footballverse.user.dto.FollowingFeedResponse;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserFollowTarget;
import com.footballverse.user.repository.UserFollowTargetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class UserFollowTargetService {
    private static final int MAX_FOLLOWS = 25;
    private static final int PREMIUM_MAX_FOLLOWS = 100;

    private final UserFollowTargetRepository follows;
    private final NewsArticleService news;
    private final CurrentUser currentUser;
    private final BillingService billingService;

    @Transactional(readOnly = true)
    public List<FollowTargetResponse> follows() {
        return follows.findByUserIdOrderByCreatedAtDesc(currentUser.get().getId()).stream().map(this::response).toList();
    }

    public FollowTargetResponse setFollow(FollowTargetRequest request) {
        UserAccount user = currentUser.get();
        String key = normalized(request.targetKey());
        String name = displayName(request.targetName());
        var existing = follows.findByUserIdAndTargetTypeAndTargetKey(user.getId(), request.targetType(), key);
        if (!request.following()) {
            existing.ifPresent(follows::delete);
            return new FollowTargetResponse(request.targetType(), key, name, false, null);
        }
        if (existing.isPresent()) return response(existing.get());
        int maxFollows = billingService.isFeatureGatesEnabled() && billingService.isPremium(user.getId()) ? PREMIUM_MAX_FOLLOWS : MAX_FOLLOWS;
        if (follows.findByUserIdOrderByCreatedAtDesc(user.getId()).size() >= maxFollows) {
            throw new ForbiddenException("You can follow up to " + maxFollows + " targets");
        }
        return response(follows.save(new UserFollowTarget(user, request.targetType(), key, name)));
    }

    @Transactional(readOnly = true)
    public FollowingFeedResponse feed(int limit) {
        List<FollowTargetResponse> current = follows();
        List<NewsArticleService.FollowingTerm> terms = current.stream()
                .map(follow -> new NewsArticleService.FollowingTerm(follow.targetName(), follow.targetName()))
                .toList();
        List<FollowingFeedItemResponse> items = news.followingArticles(terms, limit).stream()
                .map(item -> new FollowingFeedItemResponse(item.article(), item.reasons()))
                .toList();
        return new FollowingFeedResponse(current, items);
    }

    private FollowTargetResponse response(UserFollowTarget follow) {
        return new FollowTargetResponse(
                follow.getTargetType(), follow.getTargetKey(), follow.getTargetName(), true, follow.getCreatedAt()
        );
    }

    private String normalized(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        if (!normalized.matches("[\\p{L}\\p{N} .&'/_-]+")) throw new BadRequestException("Invalid follow target");
        return normalized;
    }

    private String displayName(String value) {
        String name = value.trim().replaceAll("\\s+", " ");
        if (name.isBlank()) throw new BadRequestException("Invalid follow target");
        return name;
    }
}
