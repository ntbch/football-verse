package com.footballverse.security;

import com.footballverse.user.UserAccount;
import com.footballverse.user.UserAccountRepository;
import com.footballverse.user.UserRole;
import com.footballverse.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityUserDetailsService implements UserDetailsService {
    private final UserAccountRepository users;

    @Override
    public UserDetails loadUserByUsername(String email) {
        UserAccount user = users.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return User.withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .disabled(user.getStatus() == UserStatus.BANNED)
                .authorities(user.getRoles().stream()
                        .map(UserRole::name)
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .toList())
                .build();
    }
}
