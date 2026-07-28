package com.footballverse.auth.repository;

import com.footballverse.auth.model.AuthMailOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuthMailOutboxRepository extends JpaRepository<AuthMailOutbox, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select message from AuthMailOutbox message join fetch message.recipient where message.sentAt is null and message.failedAt is null and message.nextAttemptAt <= :now order by message.createdAt")
    List<AuthMailOutbox> findPendingForUpdate(@Param("now") Instant now, Pageable pageable);
}
