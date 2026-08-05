package com.footballverse.billing.repository;

import com.footballverse.billing.model.PremiumLedgerEntryType;
import com.footballverse.billing.model.PremiumMembershipLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PremiumMembershipLedgerRepository extends JpaRepository<PremiumMembershipLedger, Long> {
    Optional<PremiumMembershipLedger> findByOrderIdAndEntryType(UUID orderId, PremiumLedgerEntryType entryType);
}
