package com.footballverse.forum.service;

import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.forum.repository.ForumCategoryRepository;
import com.footballverse.forum.repository.ForumPostLikeRepository;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumThreadFollowRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.notification.service.MentionService;
import com.footballverse.notification.service.NotificationService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ForumThreadServiceTest {
    @Mock private ForumCategoryRepository categories;
    @Mock private ForumThreadRepository threads;
    @Mock private ForumPostRepository posts;
    @Mock private ForumPostLikeRepository forumPostLikeRepository;
    @Mock private ForumThreadFollowRepository follows;
    @Mock private RichTextSanitizer sanitizer;
    @Mock private CurrentUser currentUser;
    @Mock private NotificationService notifications;
    @Mock private MentionService mentionService;
    @InjectMocks private ForumThreadService service;

    @Test
    void unansweredFilterUsesServerOwnedSolvedState() {
        PageRequest page = PageRequest.of(0, 20);
        when(threads.findByCategorySlugAndHiddenFalseAndSolvedFalseOrderByPinnedDescLastActivityAtDesc("general", page))
                .thenReturn(Page.empty(page));

        var result = service.threads("general", 0, 20, "latest", true);

        assertThat(result.content()).isEmpty();
        verify(threads).findByCategorySlugAndHiddenFalseAndSolvedFalseOrderByPinnedDescLastActivityAtDesc("general", page);
    }

    @Test
    void followingFilterUsesCurrentUserAndCapsPageSize() {
        UserAccount user = new UserAccount("fan@footballverse.local", "fan", "hash");
        user.setId(7L);
        PageRequest page = PageRequest.of(0, 50);
        when(currentUser.get()).thenReturn(user);
        when(threads.findFollowedByUserAndCategorySlug(7L, "general", page)).thenReturn(Page.empty(page));

        var result = service.threads("general", -1, 500, "latest", false, true);

        assertThat(result.content()).isEmpty();
        verify(threads).findFollowedByUserAndCategorySlug(7L, "general", page);
    }
}
