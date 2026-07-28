package com.footballverse.auth.repository;

import com.footballverse.auth.model.AuthRateLimitWindow;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface AuthRateLimitWindowRepository extends JpaRepository<AuthRateLimitWindow, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select window from AuthRateLimitWindow window where window.action = :action and window.identityHash = :identityHash")
    Optional<AuthRateLimitWindow> findForUpdate(@Param("action") String action, @Param("identityHash") String identityHash);

    void deleteByWindowStartedAtBefore(Instant before);
}
