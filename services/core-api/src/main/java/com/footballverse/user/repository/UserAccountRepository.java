package com.footballverse.user.repository;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.model.UserRole;
import com.footballverse.user.model.UserStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByGoogleId(String googleId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from UserAccount user where user.id = :id")
    Optional<UserAccount> findByIdForUpdate(@Param("id") Long id);

    List<UserAccount> findByEmailVerifiedFalseAndCreatedAtBefore(Instant before);

    @Query("select user from UserAccount user where " +
           "(:search = '' or lower(user.email) like lower(concat('%', :search, '%')) " +
           "or lower(user.username) like lower(concat('%', :search, '%'))) and " +
           "(:role is null or exists (select role from user.roles role where role = :role))")
    Page<UserAccount> searchAdminUsers(@Param("search") String search, @Param("role") UserRole role, Pageable pageable);

    @Query("select count(user) from UserAccount user join user.roles role where role = :role and user.status = :status")
    long countByRoleAndStatus(@Param("role") UserRole role, @Param("status") UserStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select distinct user from UserAccount user join user.roles role where role = :role and user.status = :status")
    List<UserAccount> findByRoleAndStatusForUpdate(@Param("role") UserRole role, @Param("status") UserStatus status);

    @Query("SELECT CAST(u.createdAt AS LocalDate) as date, COUNT(u) as count " +
           "FROM UserAccount u " +
           "WHERE u.createdAt >= :since " +
           "GROUP BY CAST(u.createdAt AS LocalDate) " +
           "ORDER BY CAST(u.createdAt AS LocalDate) ASC")
    List<Object[]> countUsersCreatedGroupedByDate(@Param("since") Instant since);
}
