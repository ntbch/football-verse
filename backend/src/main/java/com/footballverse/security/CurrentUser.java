package com.footballverse.security;

import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUser {
    private final UserAccountRepository users;

    public UserAccount get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new ResourceNotFoundException("Current user not found");
        }
        return users.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    public UserAccount getOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return users.findByEmail(authentication.getName()).orElse(null);
    }
}
