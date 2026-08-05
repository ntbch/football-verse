package com.footballverse.billing.model;

import com.footballverse.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_events")
@Getter
@NoArgsConstructor
public class PaymentEvent extends AuditableEntity {
    @Id
    private UUID id;

    @Column(name = "provider_event_id", nullable = false, unique = true, length = 100)
    private String providerEventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private PaymentOrder order;

    @Column(name = "invoice_number", length = 40)
    private String invoiceNumber;

    @Column(name = "notification_type", nullable = false, length = 40)
    private String notificationType;

    @Column(name = "provider_order_status", length = 40)
    private String providerOrderStatus;

    @Column(name = "provider_transaction_status", length = 40)
    private String providerTransactionStatus;

    @Column(name = "amount_vnd")
    private Long amountVnd;

    @Column(length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PaymentEventStatus status;

    @Column(length = 300)
    private String reason;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    public PaymentEvent(String providerEventId, PaymentOrder order, String invoiceNumber,
                        String notificationType, String providerOrderStatus,
                        String providerTransactionStatus, Long amountVnd, String currency,
                        PaymentEventStatus status, String reason, Instant receivedAt) {
        this.id = UUID.randomUUID();
        this.providerEventId = providerEventId;
        this.order = order;
        this.invoiceNumber = invoiceNumber;
        this.notificationType = notificationType;
        this.providerOrderStatus = providerOrderStatus;
        this.providerTransactionStatus = providerTransactionStatus;
        this.amountVnd = amountVnd;
        this.currency = currency;
        this.status = status;
        this.reason = reason;
        this.receivedAt = receivedAt;
        this.processedAt = status == PaymentEventStatus.PROCESSED ? receivedAt : null;
    }
}
