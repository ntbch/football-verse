package com.footballverse.notification;

import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MentionService {
    private final UserAccountRepository users;
    private final NotificationService notifications;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9_\\-]+)");

    public void processMentions(UserAccount author, String content, String messageTemplate, String linkUrl) {
        if (content == null || content.isBlank()) {
            return;
        }
        Set<String> usernames = new HashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            usernames.add(matcher.group(1));
        }

        for (String username : usernames) {
            if (username.equalsIgnoreCase(author.getUsername())) {
                continue; // Don't notify self
            }
            users.findByUsername(username).ifPresent(mentionedUser -> {
                String message = String.format(messageTemplate, author.getUsername());
                notifications.create(mentionedUser, NotificationType.FORUM_MENTION, message, linkUrl);
            });
        }
    }
}
