package com.footballverse.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<UserAccount> findByEmail(String email);
}
