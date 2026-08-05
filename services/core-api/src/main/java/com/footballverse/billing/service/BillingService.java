package com.footballverse.billing.service;

import com.footballverse.billing.config.BillingProperties;
import com.footballverse.billing.dto.BillingPlanResponse;
import com.footballverse.billing.dto.CheckoutField;
import com.footballverse.billing.dto.CreatePaymentOrderRequest;
import com.footballverse.billing.dto.MembershipResponse;
import com.footballverse.billing.dto.PaymentOrderResponse;
import com.footballverse.billing.dto.QrPaymentResponse;
import com.footballverse.billing.dto.ReconciliationResponse;
import com.footballverse.billing.dto.SePayBankHubRequest;
import com.footballverse.billing.dto.SePayIpnRequest;
import com.footballverse.billing.model.PaymentEvent;
import com.footballverse.billing.model.PaymentEventStatus;
import com.footballverse.billing.model.PaymentOrder;
import com.footballverse.billing.model.PaymentOrderStatus;
import com.footballverse.billing.model.PremiumLedgerEntryType;
import com.footballverse.billing.model.PremiumMembership;
import com.footballverse.billing.model.PremiumMembershipLedger;
import com.footballverse.billing.repository.PaymentEventRepository;
import com.footballverse.billing.repository.PaymentOrderRepository;
import com.footballverse.billing.repository.PremiumMembershipLedgerRepository;
import com.footballverse.billing.repository.PremiumMembershipRepository;
import com.footballverse.common.exception.BadRequestException;
import com.footballverse.common.exception.ConflictException;
import com.footballverse.common.exception.ForbiddenException;
import com.footballverse.common.exception.ResourceNotFoundException;
import com.footballverse.common.pagination.PageResponse;
import com.footballverse.security.CurrentUser;
import com.footballverse.user.model.UserAccount;
import com.footballverse.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class BillingService {
    private static final String PROVIDER = "SEPAY";
    private static final String CURRENCY = "VND";
    private static final String PAYMENT_METHOD = "BANK_TRANSFER";
    private static final String QR_IMAGE_BASE_URL = "https://img.vietqr.io/image/";
    private static final Pattern INVOICE_PATTERN = Pattern.compile("\\bFV[A-Z0-9]{24}\\b");

    private final BillingProperties properties;
    private final PaymentOrderRepository orders;
    private final PaymentEventRepository events;
    private final PremiumMembershipRepository memberships;
    private final PremiumMembershipLedgerRepository ledger;
    private final UserAccountRepository users;
    private final CurrentUser currentUser;
    private final SePayReconciliationClient reconciliationClient;

    @Transactional(readOnly = true)
    public List<BillingPlanResponse> plans() {
        boolean purchasable = properties.isReadyForSales();
        return planCatalog().stream()
                .map(plan -> new BillingPlanResponse(plan.code(), plan.name(), plan.durationDays(), plan.amountVnd(), CURRENCY,
                        purchasable && plan.amountVnd() > 0))
                .toList();
    }

    @Transactional
    public PaymentOrderResponse createOrder(CreatePaymentOrderRequest request, UUID requestId) {
        if (!properties.isReadyForSales()) throw new BadRequestException("Premium checkout is not available");
        UserAccount user = users.findByIdForUpdate(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        Instant now = Instant.now();
        expirePendingForUser(user.getId(), now);
        PaymentOrder existing = orders.findByUserIdAndClientRequestId(user.getId(), requestId).orElse(null);
        if (existing != null) return response(existing, true);
        if (orders.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), PaymentOrderStatus.PENDING).isPresent()) {
            throw new ConflictException("You already have an unpaid order. Pay it or cancel it before creating another.");
        }

        Plan plan = plan(request.planCode());
        String invoice = "FV" + UUID.randomUUID().toString().replace("-", "").substring(0, 24).toUpperCase();
        PaymentOrder order = orders.save(new PaymentOrder(
                user, requestId, invoice, PROVIDER, plan.code(), plan.amountVnd(), plan.durationDays(),
                CURRENCY, PAYMENT_METHOD, now.plusSeconds(30 * 60L)
        ));
        return response(order, true);
    }

    @Transactional(readOnly = true)
    public MembershipResponse membership() {
        UserAccount user = currentUser.get();
        return membershipResponse(memberships.findByUserId(user.getId()).orElse(null), Instant.now());
    }

    @Transactional
    public PageResponse<PaymentOrderResponse> history(int page, int size) {
        UserAccount user = users.findByIdForUpdate(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        expirePendingForUser(user.getId(), Instant.now());
        return PageResponse.from(orders.findByUserIdAndHiddenAtIsNullOrderByCreatedAtDesc(user.getId(), PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50)
        )).map(order -> response(order, false)));
    }

    @Transactional
    public void hideOrder(String invoice) {
        UserAccount user = users.findByIdForUpdate(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        PaymentOrder order = orders.findByInvoiceNumberForUpdate(invoice)
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        requireOwner(order, user);
        if (order.getStatus() == PaymentOrderStatus.PENDING) {
            throw new BadRequestException("Cancel the unpaid order before removing it");
        }
        if (order.getStatus() == PaymentOrderStatus.PAID || order.getStatus() == PaymentOrderStatus.REVIEW_REQUIRED) {
            throw new BadRequestException("Paid or under-review orders cannot be removed");
        }
        order.hide();
    }

    @Transactional
    public PaymentOrderResponse cancelOrder(String invoice) {
        UserAccount user = users.findByIdForUpdate(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        PaymentOrder order = orders.findByInvoiceNumberForUpdate(invoice)
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        requireOwner(order, user);
        normalizeExpiry(order, Instant.now());
        if (order.getStatus() != PaymentOrderStatus.PENDING) {
            throw new BadRequestException("Only unpaid orders can be cancelled");
        }
        order.cancel();
        return response(order, false);
    }

    @Transactional
    public PaymentOrderResponse order(String invoice) {
        UserAccount user = users.findByIdForUpdate(currentUser.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        PaymentOrder order = orders.findByInvoiceNumberForUpdate(invoice)
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        requireOwner(order, user);
        normalizeExpiry(order, Instant.now());
        return response(order, true);
    }

    public ReconciliationResponse reconcile(String invoice) {
        PaymentOrder order = orders.findByInvoiceNumber(invoice)
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        return reconciliationClient.lookup(order);
    }

    @Transactional
    public WebhookResult processIpn(String secret, SePayIpnRequest payload) {
        if (!constantTimeEquals(properties.getIpnSecret(), secret)) return WebhookResult.UNAUTHORIZED;
        if (payload == null || payload.transaction() == null) return WebhookResult.REVIEW_REQUIRED;

        String eventId = firstNonBlank(payload.transaction().id(), payload.transaction().transaction_id());
        if (eventId == null) return WebhookResult.REVIEW_REQUIRED;
        if (events.findByProviderEventId(eventId).isPresent()) return WebhookResult.DUPLICATE;

        String invoice = payload.order() == null ? null : payload.order().order_invoice_number();
        LockedOrder locked = lockOrderForProcessing(invoice);
        if (events.findByProviderEventId(eventId).isPresent()) return WebhookResult.DUPLICATE;
        PaymentOrder order = locked.order();
        UserAccount lockedUser = locked.user();
        Long amount = amount(payload.transaction().transaction_amount());
        PaymentEventStatus eventStatus = PaymentEventStatus.REVIEW_REQUIRED;
        String reason = "Payment event requires review";

        if (order != null && validPaidEvent(payload, order, amount)) {
            PremiumMembership membership = memberships.findByUserIdForUpdate(lockedUser.getId()).orElse(null);
            if (membership == null) {
                Instant now = Instant.now();
                membership = new PremiumMembership(lockedUser, now, now);
                membership = memberships.saveAndFlush(membership);
            }
            Instant previous = membership.getValidUntil();
            Instant paidAt = Instant.now();
            Instant next = membership.grant(order.getDurationDays(), paidAt);
            order.markPaid(payload.order().order_id(), eventId, paidAt);
            ledger.save(new PremiumMembershipLedger(
                    lockedUser, order, PremiumLedgerEntryType.GRANT, order.getDurationDays(), previous, next,
                    null, "Verified bank-transfer payment"
            ));
            eventStatus = PaymentEventStatus.PROCESSED;
            reason = null;
        } else if (order != null && order.getStatus() == PaymentOrderStatus.PAID) {
            eventStatus = PaymentEventStatus.DUPLICATE;
            reason = "Order was already fulfilled";
        } else if (order == null) {
            reason = "Invoice does not match a local order";
        } else if (!"ORDER_PAID".equals(payload.notification_type())) {
            reason = "Unsupported notification type";
            order.markReviewRequired();
        } else if (order.getStatus() == PaymentOrderStatus.CANCELLED || order.getStatus() == PaymentOrderStatus.EXPIRED) {
            reason = "Order is terminal; payment requires manual review";
        } else {
            reason = "Provider amount, currency, status, or method did not match the order";
            order.markReviewRequired();
        }

        events.save(new PaymentEvent(
                eventId, order, invoice, firstNonBlank(payload.notification_type(), "UNKNOWN"),
                payload.order() == null ? null : payload.order().order_status(), payload.transaction().transaction_status(), amount,
                payload.transaction().transaction_currency(), eventStatus, reason, Instant.now()
        ));
        return eventStatus == PaymentEventStatus.PROCESSED ? WebhookResult.PROCESSED
                : eventStatus == PaymentEventStatus.DUPLICATE ? WebhookResult.DUPLICATE : WebhookResult.REVIEW_REQUIRED;
    }

    @Transactional
    public WebhookResult processBankHubIpn(String authorization, SePayBankHubRequest payload) {
        String expected = "Apikey " + properties.getBankHubApiKey();
        if (!properties.isBankHubReady() || !constantTimeEquals(expected, authorization)) {
            return WebhookResult.UNAUTHORIZED;
        }
        if (payload == null || payload.transaction_id() == null || payload.transaction_id().isBlank()) {
            return WebhookResult.REVIEW_REQUIRED;
        }
        String eventId = payload.transaction_id().trim();
        if (events.findByProviderEventId(eventId).isPresent()) return WebhookResult.DUPLICATE;

        Long amount = amount(payload.amount());
        String invoice = firstNonBlank(payload.payment_code(), extractInvoice(payload.content()));
        LockedOrder locked = lockOrderForProcessing(invoice);
        if (events.findByProviderEventId(eventId).isPresent()) return WebhookResult.DUPLICATE;
        PaymentOrder order = locked.order();
        UserAccount lockedUser = locked.user();
        PaymentEventStatus eventStatus = PaymentEventStatus.REVIEW_REQUIRED;
        String reason = "Bank transfer requires review";

        if (order != null && isCredit(payload.transfer_type()) && amount != null && amount == order.getAmountVnd()
                && order.getStatus() == PaymentOrderStatus.PENDING) {
            PremiumMembership membership = memberships.findByUserIdForUpdate(lockedUser.getId()).orElse(null);
            if (membership == null) {
                Instant now = Instant.now();
                membership = new PremiumMembership(lockedUser, now, now);
                membership = memberships.saveAndFlush(membership);
            }
            Instant previous = membership.getValidUntil();
            Instant paidAt = Instant.now();
            Instant next = membership.grant(order.getDurationDays(), paidAt);
            order.markPaid(firstNonBlank(payload.reference_code(), payload.gateway()), eventId, paidAt);
            ledger.save(new PremiumMembershipLedger(
                    lockedUser, order, PremiumLedgerEntryType.GRANT, order.getDurationDays(), previous, next,
                    null, "Verified bank-transfer credit"
            ));
            eventStatus = PaymentEventStatus.PROCESSED;
            reason = null;
        } else if (order != null && order.getStatus() == PaymentOrderStatus.PAID) {
            eventStatus = PaymentEventStatus.DUPLICATE;
            reason = "Order was already fulfilled";
        } else if (order == null) {
            reason = "Payment code does not match a local order";
        } else if (order.getStatus() == PaymentOrderStatus.CANCELLED || order.getStatus() == PaymentOrderStatus.EXPIRED) {
            reason = "Order is terminal; payment requires manual review";
        } else if (!isCredit(payload.transfer_type())) {
            reason = "Debit transactions cannot grant Premium";
            order.markReviewRequired();
        } else {
            reason = "Bank transfer amount did not match the order";
            order.markReviewRequired();
        }

        events.save(new PaymentEvent(
                eventId, order, invoice, "BANK_TRANSFER_CREDIT", payload.transfer_type(), "RECEIVED", amount,
                "VND", eventStatus, reason, Instant.now()
        ));
        return eventStatus == PaymentEventStatus.PROCESSED ? WebhookResult.PROCESSED
                : eventStatus == PaymentEventStatus.DUPLICATE ? WebhookResult.DUPLICATE : WebhookResult.REVIEW_REQUIRED;
    }

    @Transactional
    public int expirePendingOrders() {
        int changed = 0;
        for (PaymentOrder order : orders.findByStatusAndExpiresAtBeforeForUpdate(PaymentOrderStatus.PENDING, Instant.now())) {
            order.markExpired();
            changed++;
        }
        return changed;
    }

    @Transactional(readOnly = true)
    public boolean isPremium(Long userId) {
        return memberships.findByUserId(userId).map(item -> item.isActiveAt(Instant.now())).orElse(false);
    }

    public boolean isFeatureGatesEnabled() {
        return properties.isEnabled() && properties.isSalesEnabled();
    }

    public void requirePremium(Long userId) {
        if (!isPremium(userId)) throw new ForbiddenException("Premium membership required");
    }

    private boolean validPaidEvent(SePayIpnRequest payload, PaymentOrder order, Long transactionAmount) {
        return "ORDER_PAID".equals(payload.notification_type())
                && "CAPTURED".equalsIgnoreCase(payload.order().order_status())
                && "APPROVED".equalsIgnoreCase(payload.transaction().transaction_status())
                && CURRENCY.equalsIgnoreCase(payload.order().order_currency())
                && CURRENCY.equalsIgnoreCase(payload.transaction().transaction_currency())
                && PAYMENT_METHOD.equalsIgnoreCase(payload.transaction().payment_method())
                && transactionAmount != null
                && transactionAmount == order.getAmountVnd()
                && amount(payload.order().order_amount()) != null
                && amount(payload.order().order_amount()) == order.getAmountVnd()
                && order.getStatus() == PaymentOrderStatus.PENDING;
    }

    private PaymentOrderResponse response(PaymentOrder order, boolean checkout) {
        List<CheckoutField> fields = List.of();
        String checkoutUrl = null;
        QrPaymentResponse qrPayment = checkout && order.getStatus() == PaymentOrderStatus.PENDING
                ? qrPayment(order) : null;
        if (qrPayment == null && checkout && order.getStatus() == PaymentOrderStatus.PENDING && properties.isReadyForSales()) {
            String success = properties.getPublicUrl() + "/premium/payment/success?invoice=" + order.getInvoiceNumber();
            String error = properties.getPublicUrl() + "/premium/payment/error?invoice=" + order.getInvoiceNumber();
            String cancel = properties.getPublicUrl() + "/premium/payment/cancel?invoice=" + order.getInvoiceNumber();
            Map<String, String> values = SePaySigner.orderedFields(
                    Long.toString(order.getAmountVnd()), properties.getMerchantId(), order.getCurrency(), "PURCHASE",
                    "Football Verse Premium - " + order.getPlanCode(), order.getInvoiceNumber(), order.getPaymentMethod(),
                    success, error, cancel, properties.getSecretKey()
            );
            fields = values.entrySet().stream().map(item -> new CheckoutField(item.getKey(), item.getValue())).toList();
            checkoutUrl = properties.getCheckoutUrl();
        }
        return new PaymentOrderResponse(order.getId(), order.getInvoiceNumber(), order.getPlanCode(), order.getAmountVnd(),
                order.getDurationDays(), order.getCurrency(), order.getStatus(), order.getExpiresAt(), order.getPaidAt(), order.getCreatedAt(),
                checkoutUrl, fields, qrPayment);
    }

    private QrPaymentResponse qrPayment(PaymentOrder order) {
        if (!properties.isQrReady()) return null;
        String content = order.getInvoiceNumber();
        String imageUrl = QR_IMAGE_BASE_URL + properties.getQrBankCode() + "-" + properties.getQrAccountNumber()
                + "-" + properties.getQrTemplate() + ".png?amount=" + order.getAmountVnd()
                + "&addInfo=" + encode(content) + "&accountName=" + encode(properties.getQrAccountName());
        return new QrPaymentResponse(properties.getQrBankCode(), properties.getQrAccountNumber(),
                properties.getQrAccountName(), order.getAmountVnd(), content, imageUrl);
    }

    private MembershipResponse membershipResponse(PremiumMembership membership, Instant now) {
        if (membership == null) return new MembershipResponse(false, null, null, null, "MANUAL");
        boolean active = membership.isActiveAt(now);
        return new MembershipResponse(active, active ? membership.getStatus() : com.footballverse.billing.model.PremiumMembershipStatus.EXPIRED,
                membership.getValidFrom(), membership.getValidUntil(), "MANUAL");
    }

    private List<Plan> planCatalog() {
        return List.of(
                new Plan("PREMIUM_1_MONTH", "1 month / 30 days", 30, properties.getPremium1MonthPriceVnd()),
                new Plan("PREMIUM_3_MONTHS", "3 months / 90 days", 90, properties.getPremium3MonthPriceVnd()),
                new Plan("PREMIUM_6_MONTHS", "6 months / 180 days", 180, properties.getPremium6MonthPriceVnd()),
                new Plan("PREMIUM_12_MONTHS", "12 months / 365 days", 365, properties.getPremium12MonthPriceVnd())
        );
    }

    private Plan plan(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        return switch (normalized) {
            case "PREMIUM_1_MONTH", "PREMIUM_30_DAYS" -> planCatalog().get(0);
            case "PREMIUM_3_MONTHS" -> planCatalog().get(1);
            case "PREMIUM_6_MONTHS" -> planCatalog().get(2);
            case "PREMIUM_12_MONTHS", "PREMIUM_365_DAYS" -> planCatalog().get(3);
            default -> throw new BadRequestException("Unknown Premium plan");
        };
    }

    private LockedOrder lockOrderForProcessing(String invoice) {
        if (invoice == null || invoice.isBlank()) return new LockedOrder(null, null);
        PaymentOrder candidate = orders.findByInvoiceNumber(invoice).orElse(null);
        if (candidate == null) return new LockedOrder(null, null);
        UserAccount user = users.findByIdForUpdate(candidate.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment user not found"));
        PaymentOrder order = orders.findByInvoiceNumberForUpdate(invoice).orElse(null);
        if (order == null) return new LockedOrder(null, user);
        normalizeExpiry(order, Instant.now());
        return new LockedOrder(order, user);
    }

    private void expirePendingForUser(Long userId, Instant now) {
        orders.findByUserIdAndStatusAndExpiresAtBefore(userId, PaymentOrderStatus.PENDING, now)
                .forEach(PaymentOrder::markExpired);
    }

    private void normalizeExpiry(PaymentOrder order, Instant now) {
        if (order.getStatus() == PaymentOrderStatus.PENDING && !order.getExpiresAt().isAfter(now)) {
            order.markExpired();
        }
    }

    private void requireOwner(PaymentOrder order, UserAccount user) {
        if (!order.getUser().getId().equals(user.getId())) throw new ResourceNotFoundException("Payment order not found");
    }

    private Long amount(BigDecimal value) {
        if (value == null) return null;
        try {
            return value.stripTrailingZeros().longValueExact();
        } catch (ArithmeticException exception) {
            return null;
        }
    }

    private String extractInvoice(String content) {
        if (content == null) return null;
        Matcher matcher = INVOICE_PATTERN.matcher(content.toUpperCase());
        return matcher.find() ? matcher.group() : null;
    }

    private boolean isCredit(String transferType) {
        return "credit".equalsIgnoreCase(transferType) || "in".equalsIgnoreCase(transferType);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        if (second != null && !second.isBlank()) return second;
        return null;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        return java.security.MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    public enum WebhookResult { PROCESSED, DUPLICATE, REVIEW_REQUIRED, UNAUTHORIZED }

    private record Plan(String code, String name, int durationDays, long amountVnd) {}

    private record LockedOrder(PaymentOrder order, UserAccount user) {}
}
