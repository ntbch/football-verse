package com.footballverse.user.service;

import com.footballverse.news.service.NewsArticleService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.dto.FollowTargetRequest;
import com.footballverse.user.model.FollowTargetType;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserFollowTarget;
import com.footballverse.user.repository.UserFollowTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserFollowTargetServiceTest {
    @Mock private UserFollowTargetRepository follows;
    @Mock private NewsArticleService news;
    @Mock private CurrentUser currentUser;
    @Mock private UserAccount user;

    private UserFollowTargetService service;

    @BeforeEach
    void setUp() {
        service = new UserFollowTargetService(follows, news, currentUser);
        when(currentUser.get()).thenReturn(user);
        when(user.getId()).thenReturn(7L);
    }

    @Test
    void normalizesTargetKeysAndKeepsFollowIdempotent() {
        UserFollowTarget existing = new UserFollowTarget(user, FollowTargetType.CLUB, "manchester city", "Manchester City");
        when(follows.findByUserIdAndTargetTypeAndTargetKey(7L, FollowTargetType.CLUB, "manchester city"))
                .thenReturn(Optional.of(existing));

        var response = service.setFollow(new FollowTargetRequest(FollowTargetType.CLUB, "  Manchester   City ", "Manchester City", true));

        assertThat(response.targetKey()).isEqualTo("manchester city");
        assertThat(response.following()).isTrue();
        verify(follows, never()).save(existing);
    }

    @Test
    void unfollowIsIdempotentWhenTargetDoesNotExist() {
        when(follows.findByUserIdAndTargetTypeAndTargetKey(7L, FollowTargetType.TOPIC, "transfers"))
                .thenReturn(Optional.empty());

        var response = service.setFollow(new FollowTargetRequest(FollowTargetType.TOPIC, "transfers", "Transfers", false));

        assertThat(response.following()).isFalse();
        verify(follows, never()).delete(org.mockito.ArgumentMatchers.any());
    }
}
