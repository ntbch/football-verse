package com.footballverse.billing.repository;

import com.footballverse.billing.model.PremiumMembership;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PremiumMembershipRepository extends JpaRepository<PremiumMembership, Long> {
    Optional<PremiumMembership> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select membership from PremiumMembership membership where membership.user.id = :userId")
    Optional<PremiumMembership> findByUserIdForUpdate(@Param("userId") Long userId);
}
