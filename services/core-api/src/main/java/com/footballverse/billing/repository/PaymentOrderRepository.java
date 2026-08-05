package com.footballverse.billing.repository;

import com.footballverse.billing.model.PaymentOrder;
import com.footballverse.billing.model.PaymentOrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, UUID> {
    Optional<PaymentOrder> findByUserIdAndClientRequestId(Long userId, UUID clientRequestId);
    Optional<PaymentOrder> findByInvoiceNumber(String invoiceNumber);

    Optional<PaymentOrder> findByInvoiceNumberAndUserId(String invoiceNumber, Long userId);

    Optional<PaymentOrder> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, PaymentOrderStatus status);

    List<PaymentOrder> findByUserIdAndStatusAndExpiresAtBefore(Long userId, PaymentOrderStatus status, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select order from PaymentOrder order where order.invoiceNumber = :invoice")
    Optional<PaymentOrder> findByInvoiceNumberForUpdate(@Param("invoice") String invoice);

    Page<PaymentOrder> findByUserIdAndHiddenAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<PaymentOrder> findByStatusAndExpiresAtBefore(PaymentOrderStatus status, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select order from PaymentOrder order where order.status = :status and order.expiresAt <= :now")
    List<PaymentOrder> findByStatusAndExpiresAtBeforeForUpdate(@Param("status") PaymentOrderStatus status, @Param("now") Instant now);
}
