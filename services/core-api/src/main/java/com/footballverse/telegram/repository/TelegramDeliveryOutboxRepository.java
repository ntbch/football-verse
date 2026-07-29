package com.footballverse.telegram.repository;

import com.footballverse.telegram.model.TelegramDeliveryOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.time.Instant;
import java.util.List;

public interface TelegramDeliveryOutboxRepository extends JpaRepository<TelegramDeliveryOutbox, Long> {
    boolean existsByArticleId(Long articleId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from TelegramDeliveryOutbox o join fetch o.article where o.sentAt is null and o.failedAt is null and o.nextAttemptAt <= :now order by o.id")
    List<TelegramDeliveryOutbox> findPendingForUpdate(Instant now, Pageable pageable);
}
