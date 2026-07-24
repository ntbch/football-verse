package com.footballverse.forum.service;

import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.text.RichTextSanitizer;
import com.footballverse.forum.dto.PostResponse;
import com.footballverse.forum.dto.ReplyRequest;
import com.footballverse.forum.model.ForumPost;
import com.footballverse.forum.model.ForumPostLike;
import com.footballverse.forum.model.ForumThread;
import com.footballverse.forum.model.ForumThreadFollow;
import com.footballverse.forum.repository.ForumPostLikeRepository;
import com.footballverse.forum.repository.ForumPostRepository;
import com.footballverse.forum.repository.ForumThreadFollowRepository;
import com.footballverse.forum.repository.ForumThreadRepository;
import com.footballverse.notification.model.NotificationType;
import com.footballverse.notification.service.MentionService;
import com.footballverse.notification.service.NotificationService;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForumPostService {

    private final ForumThreadRepository threads;
    private final ForumPostRepository posts;
    private final ForumPostLikeRepository forumPostLikeRepository;
    private final ForumThreadFollowRepository follows;
    private final RichTextSanitizer sanitizer;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final MentionService mentionService;

    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Transactional
    public PostResponse reply(Long threadId, ReplyRequest request) {
        UserAccount user = currentUser.get();
        ForumThread thread = threads.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));
        if (thread.isLocked()) {
            throw new BadRequestException("Thread is locked");
        }
        ForumPost post = new ForumPost();
        post.setThread(thread);
        post.setAuthor(user);
        post.setContent(sanitizer.sanitize(request.content()));
        ForumPost saved = posts.save(post);
        thread.setLastActivityAt(Instant.now());
        mentionService.processMentions(user, request.content(), "%s mentioned you in a forum post", "/forum/threads/" + thread.getSlug());
        notifyReplySubscribers(thread, user);

        PostResponse response = toPost(saved);

        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        String json = objectMapper.writeValueAsString(response);
                        redisTemplate.convertAndSend("realtime:threads:" + thread.getSlug(), json);
                        log.info("Published real-time reply for thread {} to Redis after commit", thread.getSlug());
                    } catch (Exception e) {
                        log.error("Failed to publish real-time reply to Redis", e);
                    }
                }
            }
        );

        return response;
    }

    @Transactional
    public PostResponse hidePost(Long id, boolean hidden) {
        ForumPost post = posts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        post.setHidden(hidden);
        if (hidden && post.getThread().getBestAnswer() != null && post.getThread().getBestAnswer().getId().equals(post.getId())) {
            post.getThread().setBestAnswer(null);
            post.getThread().setSolved(false);
        }
        return toPost(post);
    }

    @Transactional
    public boolean toggleLikePost(Long postId) {
        UserAccount user = currentUser.get();
        ForumPost post = posts.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        return forumPostLikeRepository.findByPostIdAndUserId(postId, user.getId())
                .map(like -> {
                    forumPostLikeRepository.delete(like);
                    return false;
                })
                .orElseGet(() -> {
                    forumPostLikeRepository.save(new ForumPostLike(post, user));
                    return true;
                });
    }

    public PostResponse toPost(ForumPost post) {
        long likeCount = forumPostLikeRepository.countByPostId(post.getId());
        UserAccount current = currentUser.getOrNull();
        boolean liked = current != null && forumPostLikeRepository.existsByPostIdAndUserId(post.getId(), current.getId());

        return new PostResponse(
                post.getId(),
                post.getAuthor().getUsername(),
                post.getContent(),
                post.getCreatedAt(),
                likeCount,
                liked
        );
    }

    private void notifyReplySubscribers(ForumThread thread, UserAccount replier) {
        Set<Long> notified = new HashSet<>();
        String link = "/forum/threads/" + thread.getSlug();
        String message = replier.getUsername() + " replied to " + thread.getTitle();
        if (!thread.getAuthor().getId().equals(replier.getId())) {
            notifications.create(thread.getAuthor(), NotificationType.FORUM_REPLY, message, link);
            notified.add(thread.getAuthor().getId());
        }
        List<ForumThreadFollow> threadFollows = follows.findByThreadId(thread.getId());
        threadFollows.forEach(follow -> {
            UserAccount user = follow.getUser();
            if (!user.getId().equals(replier.getId()) && notified.add(user.getId())) {
                notifications.create(user, NotificationType.FORUM_REPLY, message, link);
            }
        });
    }
}
