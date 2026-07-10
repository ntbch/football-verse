package com.footballverse.user.repository;
import com.footballverse.user.model.UserAccount;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByGoogleId(String googleId);

    @Query("SELECT CAST(u.createdAt AS LocalDate) as date, COUNT(u) as count " +
           "FROM UserAccount u " +
           "WHERE u.createdAt >= :since " +
           "GROUP BY CAST(u.createdAt AS LocalDate) " +
           "ORDER BY CAST(u.createdAt AS LocalDate) ASC")
    List<Object[]> countUsersCreatedGroupedByDate(@Param("since") Instant since);
}
