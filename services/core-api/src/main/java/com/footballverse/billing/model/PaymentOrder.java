package com.footballverse.billing.model;

import com.footballverse.common.AuditableEntity;
import com.footballverse.user.model.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_orders", uniqueConstraints = {
        @UniqueConstraint(name = "uk_payment_orders_user_request", columnNames = {"user_id", "client_request_id"}),
        @UniqueConstraint(name = "uk_payment_orders_invoice", columnNames = "invoice_number"),
        @UniqueConstraint(name = "uk_payment_orders_provider_transaction", columnNames = "provider_transaction_id")
})
@Getter
@NoArgsConstructor
public class PaymentOrder extends AuditableEntity {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "client_request_id", nullable = false, columnDefinition = "uuid")
    private UUID clientRequestId;

    @Column(name = "invoice_number", nullable = false, length = 40)
    private String invoiceNumber;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "plan_code", nullable = false, length = 40)
    private String planCode;

    @Column(name = "amount_vnd", nullable = false)
    private long amountVnd;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PaymentOrderStatus status;

    @Column(name = "provider_order_id", length = 80)
    private String providerOrderId;

    @Column(name = "provider_transaction_id", length = 100)
    private String providerTransactionId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    public PaymentOrder(UserAccount user, UUID clientRequestId, String invoiceNumber, String provider,
                        String planCode, long amountVnd, int durationDays, String currency,
                        String paymentMethod, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.clientRequestId = clientRequestId;
        this.invoiceNumber = invoiceNumber;
        this.provider = provider;
        this.planCode = planCode;
        this.amountVnd = amountVnd;
        this.durationDays = durationDays;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.status = PaymentOrderStatus.PENDING;
        this.expiresAt = expiresAt;
    }

    public void markPaid(String providerOrderId, String providerTransactionId, Instant paidAt) {
        this.status = PaymentOrderStatus.PAID;
        this.providerOrderId = providerOrderId;
        this.providerTransactionId = providerTransactionId;
        this.paidAt = paidAt;
    }

    public void markExpired() {
        if (this.status == PaymentOrderStatus.PENDING) this.status = PaymentOrderStatus.EXPIRED;
    }

    public void markReviewRequired() {
        if (this.status == PaymentOrderStatus.PENDING) this.status = PaymentOrderStatus.REVIEW_REQUIRED;
    }

    public void cancel() {
        if (this.status == PaymentOrderStatus.PENDING) {
            this.status = PaymentOrderStatus.CANCELLED;
            this.cancelledAt = Instant.now();
        }
    }

    public void hide() {
        this.hiddenAt = Instant.now();
    }
}
