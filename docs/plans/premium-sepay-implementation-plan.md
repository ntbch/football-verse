# Football Verse Premium + SePay Implementation Plan

**Status:** Backend and Web implementation in place; Sandbox/provider and production gates remain pending  
**Created:** 2026-08-05  
**Architecture decision:** Implement Billing as a bounded module inside Core
API. Do not create a Payment microservice for the first provider and first paid
product.  
**Initial payment method:** SePay Payment Gateway, one-time
`BANK_TRANSFER`/VietQR checkout in Sandbox first.  
**Safety:** Billing is disabled by default. This plan does not authorize real
charges, production credential storage, manual paid-state mutation, or
production launch.

## 1. Why This Shape Fits the Current Project

Football Verse currently has one account owner and one durable platform
database: Core API owns users, predictions, follows, notifications, and the
PostgreSQL data needed to enforce Premium access. Gateway already proxies
`/api/v1/**` to Core. The current Football Intelligence plan also explicitly
keeps new microservices out of scope while operational burden is being reduced.

Keeping Billing in Core gives the money-confirmation path one database
transaction:

```text
verified SePay IPN
    -> payment order PAID
    -> payment event recorded
    -> membership extended
    -> membership ledger recorded
    -> commit once
```

A separate service would require an outbox, retrying internal delivery,
distributed failure recovery, a second database ownership contract, another
deployment, and another backup/alert surface before any of those costs are
justified.

Extract Billing only after a measured trigger exists:

- a second payment provider;
- a second independently owned paid product such as marketplace or game items;
- another service needs to consume payment events;
- payment needs an independent release, security, or scaling boundary; or
- finance operations require an independently operated ledger.

## 2. Provider Facts and Constraints

The design is based on the official SePay documentation:

- Checkout is a browser `POST` form signed with HMAC-SHA256. Signed fields have
  a fixed order, and `order_invoice_number` must be unique:
  <https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/form-thanh-toan>
- Payment confirmation arrives through a public HTTPS IPN endpoint using
  `X-Secret-Key`. Relevant notifications include `ORDER_PAID` and
  `TRANSACTION_VOID`:
  <https://developer.sepay.vn/vi/cong-thanh-toan/IPN>
- Sandbox and Production use separate credentials and hosts. Browser checkout
  uses `pay-sandbox.sepay.vn`/`pay.sepay.vn`; REST reconciliation uses
  `pgapi-sandbox.sepay.vn`/`pgapi.sepay.vn`:
  <https://developer.sepay.vn/vi/cong-thanh-toan/sandbox>
- REST APIs use Basic authentication with `merchant_id:secret_key`:
  <https://developer.sepay.vn/vi/cong-thanh-toan/API/tong-quan>
- SePay recurring payment is not yet released. Football Verse therefore sells
  fixed access periods and asks the user to create a new payment to renew:
  <https://developer.sepay.vn/vi/cong-thanh-toan/luong-thanh-toan>

Do not describe the first release as automatic subscription renewal.

## 3. Product Contract Before Charging Money

### Premium v1

Use one product, `FOOTBALL_VERSE_PREMIUM`, with four purchasable periods:

| Plan code | Access period | Price source |
|---|---:|---|
| `PREMIUM_1_MONTH` | 30 days | Server configuration |
| `PREMIUM_3_MONTHS` | 90 days | Server configuration |
| `PREMIUM_6_MONTHS` | 180 days | Server configuration |
| `PREMIUM_12_MONTHS` | 365 days | Server configuration |

The client sends only `planCode`; it never sends an authoritative amount or
duration. Each order snapshots plan code, amount, currency, and duration so a
later price change cannot rewrite historical purchases.

Exact prices are an owner decision. No default price may silently become a
production price. Production startup must reject Billing enabled with missing
or non-positive configured prices.

### Entitlement candidates

The first paid release must unlock real, persisted behavior. Recommended v1:

- free users may own one private prediction league; Premium users may own up
  to ten; joining a league remains free;
- free users keep the current 25 follow targets; Premium users may keep up to
  100;
- detailed match model signals and score-breakdown history are Premium;
  basic fixture, prediction, result, stats, and public leaderboard remain free;
- an accessible Premium badge appears on the account/profile.

Existing users and data must not be deleted or hidden during rollout. A free
user already above a new limit keeps all existing records but cannot create
more until below the limit or Premium is active.

The product owner must approve the benefit matrix and price copy before the
production sales flag is enabled. Sandbox integration can be completed before
that approval.

## 4. Ownership and Trust Boundaries

| Concern | Owner | Rule |
|---|---|---|
| User identity | Core Auth/User | Payment order always binds to the authenticated Core user |
| Price and duration | Core Billing config | Never trust browser amount, currency, duration, or success state |
| Checkout signing | Core Billing SePay adapter | Merchant secret never reaches Web, logs, analytics, or URLs |
| Payment confirmation | Core Billing IPN | Only verified IPN or verified reconciliation may mark an order paid |
| Premium authorization | Core Billing | Query current membership; do not add `PREMIUM` to `UserRole` or JWT |
| Edge routing | Gateway | Existing `/api/v1/**` Core mount remains; no new upstream |
| Browser presentation | Web Premium feature | Redirect pages display status but cannot grant access |
| Durable records | Core PostgreSQL | Flyway only; Hibernate remains `ddl-auto=validate` |

The success, error, and cancel redirect URLs are user-navigation hints only.
Opening `/premium/payment/success` manually must never activate Premium.

## 5. Data Model

Create one Flyway migration after the current `V63` migration.

### `payment_orders`

- `id UUID PRIMARY KEY`
- `user_id BIGINT NOT NULL REFERENCES users(id)`; no cascade delete
- `client_request_id UUID NOT NULL`
- `invoice_number VARCHAR(...) NOT NULL UNIQUE`
- `provider VARCHAR(...) NOT NULL` with initial value `SEPAY`
- `plan_code VARCHAR(...) NOT NULL`
- `amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0)`
- `duration_days INTEGER NOT NULL CHECK (duration_days > 0)`
- `currency VARCHAR(3) NOT NULL CHECK (currency = 'VND')`
- `payment_method VARCHAR(...) NOT NULL`
- `status VARCHAR(...) NOT NULL`
- `provider_order_id VARCHAR(...)`
- `provider_transaction_id VARCHAR(...) UNIQUE`
- `expires_at`, `paid_at`, `cancelled_at`
- standard `created_at`, `updated_at`
- unique `(user_id, client_request_id)` for retry-safe creation

Initial states:

```text
PENDING -> PAID
PENDING -> CANCELLED
PENDING -> EXPIRED
PENDING/EXPIRED -> REVIEW_REQUIRED
PAID -> REFUNDED     # only after an approved operational flow exists
```

An expired local checkout may still receive a legitimate late `ORDER_PAID`.
Do not discard it; verify it and activate or send it to review according to
the provider state.

### `payment_events`

Store normalized fields needed for audit and deduplication, not the raw IPN:

- provider event/transaction ID, unique;
- invoice number and nullable matched order;
- notification type;
- provider order/transaction state;
- amount and currency;
- processing result (`PROCESSED`, `DUPLICATE`, `REVIEW_REQUIRED`);
- received/processed timestamps and a bounded diagnostic reason.

Do not store cardholder name, masked card number, account number, IP address,
user agent, authorization header, or the complete provider payload.

### `premium_memberships`

- one row per user;
- `status`, `valid_from`, `valid_until`;
- `version` for safe concurrent updates;
- standard timestamps.

### `premium_membership_ledger`

- immutable `GRANT`, `REVOKE`, or `ADJUST` entries;
- user, order, number of days, prior/new expiry, actor/reason, timestamp;
- unique paid-order grant to make fulfillment idempotent.

For a valid payment, extend from `max(now, current.valid_until)` by the order's
snapshotted duration. Lock the user/membership fulfillment path so two valid
payments for the same user cannot overwrite each other.

## 6. API Contract

### Public

- `GET /api/v1/billing/plans`
  - returns availability, plan codes, amount, currency, duration, and whether
    Billing is Sandbox or unavailable;
  - never returns merchant credentials.
- `POST /api/v1/billing/webhooks/sepay`
  - only exact public write route;
  - authenticates `X-Secret-Key` with constant-time comparison.

### Authenticated user

- `GET /api/v1/billing/me`
  - returns active state, plan, `validUntil`, and renewal mode `MANUAL`.
- `POST /api/v1/billing/orders`
  - requires `X-Request-ID: UUID` and `{ "planCode": "..." }`;
  - returns the persisted order plus an ordered checkout action/field list.
- `GET /api/v1/billing/orders/{invoiceNumber}`
  - owner-scoped; returns local state and activation state.
- `GET /api/v1/billing/orders?page=&size=`
  - owner-scoped bounded history.

### Admin read-only support

- `GET /api/v1/admin/billing/orders?...`
- `GET /api/v1/admin/billing/orders/{invoiceNumber}`
- `POST /api/v1/admin/billing/orders/{invoiceNumber}/reconcile`

Do not implement “mark paid” as an admin button. A support action may request
provider reconciliation, but only a verified provider result may move an order
to `PAID`. Refund/revoke mutation remains out of MVP until policy and provider
behavior are approved.

All normal responses keep the existing `ApiResponse<T>` envelope.

## 7. Checkout and IPN Processing

### Create checkout

1. Require active authenticated user and enabled Billing configuration.
2. Resolve price and duration by server-side plan code.
3. Reuse the stored order when the same user repeats `X-Request-ID`.
4. Generate an opaque unique invoice; do not embed email or username.
5. Persist `PENDING` before returning checkout data.
6. Generate HMAC-SHA256 using the exact SePay field order.
7. Return checkout URL plus an ordered array of hidden form fields.
8. Web creates and submits a native HTML `POST` form.

Do not introduce a Java SePay dependency merely for HMAC or HTTP. Java 21 JCE,
Base64, and Spring's existing HTTP facilities cover the integration.

### Process IPN

1. Reject missing/incorrect `X-Secret-Key` with `401` using constant-time
   comparison.
2. Parse into a strict, bounded DTO; reject malformed or oversized input.
3. Deduplicate using provider transaction/event ID.
4. Match exact invoice and lock the order.
5. Require `ORDER_PAID`, provider order `CAPTURED`, approved transaction,
   identical VND amount/currency, and expected payment method.
6. Atomically write event, mark order paid, extend membership, and write the
   entitlement ledger.
7. Return `200` for a valid duplicate.
8. Persist authenticated but unmatched/mismatched events as
   `REVIEW_REQUIRED`, alert operations, return the documented acknowledgement,
   and never grant access.
9. Return `5xx` only for transient internal processing failure so retry remains
   meaningful.

Log request ID, invoice, provider event ID, result, and latency only. Never log
the secret or full payload.

### Reconciliation

Add a bounded scheduler and a manual admin trigger that query SePay's order
REST API for stale `PENDING`/`REVIEW_REQUIRED` orders. Respect the documented
rate limit, use short connect/read timeouts, and apply the same fulfillment
validator as IPN. IPN and reconciliation must route through one shared
idempotent fulfillment method.

## 8. Required Changes by Area

### Core API

- Add `billing` package with model, repository, DTO, service, controller, and
  SePay adapter subpackages.
- Add configurable plan catalog and provider settings under `app.billing`.
- Permit only the exact SePay IPN route in `SecurityConfig`.
- Add conditional production validation: when Billing is enabled, require
  valid environment, positive prices, public HTTPS callback URL, merchant ID,
  provider secret, and separate IPN secret.
- Keep secrets server-side and redact them from configuration diagnostics.
- Add Premium checks directly at the few gated service methods. Do not add a
  generic annotation/AOP framework for four gates.
- Extend account export with sanitized purchase/membership history.
- On account deletion, retain financial records under the anonymized existing
  user, revoke active membership, and document the retention rule.

### Gateway

- Keep the existing Core proxy route.
- Give `/api/v1/billing/webhooks/sepay` its own rate-limit group/budget so user
  API traffic cannot consume the provider's allowance.
- Never retry POST at the proxy layer.
- Add no-store behavior for authenticated Billing responses; current bearer
  handling should already provide it and needs a regression test.

### Web

- Add `/premium` pricing/status page.
- Add `/premium/payment/success`, `/error`, and `/cancel` result pages.
- Add a small membership card to Profile and one discoverable Premium entry in
  account navigation; do not make Premium a competing primary product tab.
- Use existing TanStack Query, API client, cards, state blocks, buttons, and
  provider-neutral analytics.
- Submit the server-produced field list as a native POST form in the supplied
  order.
- Add `pay-sandbox.sepay.vn` and `pay.sepay.vn` to CSP `form-action`; do not add
  them to `script-src` or `connect-src` unless later evidence requires it.
- Keep redirect pages truthful: poll/fetch order state and show pending,
  active, review-required, cancelled, or unavailable states.

### Configuration and deployment

Add empty/safe examples only:

```text
BILLING_ENABLED=false
BILLING_SALES_ENABLED=false
SEPAY_ENV=sandbox
SEPAY_MERCHANT_ID=
SEPAY_SECRET_KEY=
SEPAY_IPN_SECRET=
PREMIUM_1_MONTH_PRICE_VND=49000
PREMIUM_3_MONTH_PRICE_VND=129000
PREMIUM_6_MONTH_PRICE_VND=219000
PREMIUM_12_MONTH_PRICE_VND=349000
```

`BILLING_ENABLED` permits Sandbox integration. `BILLING_SALES_ENABLED` is the
separate kill switch for creating new orders. Web must derive availability
from Core, not from a public build-time secret or duplicated flag.

### Documentation/legal

- Update API, database ownership, current-state architecture, analytics, smoke,
  and production operations documents.
- Update Terms and Privacy to cover provider sharing, purchase records,
  access duration, manual renewal, cancellation, refunds, and retention.
- Add a public payment/refund policy before Production sales.
- Legal/product owner approval remains an external launch gate.

## 9. Implementation Slices

### P0 — Decisions and provider setup

- [ ] Approve Premium benefit matrix.
- [ ] Approve prices, duration wording, VAT/invoice treatment, refund policy,
      and purchase-record retention.
- [ ] Create SePay Sandbox merchant and obtain Sandbox merchant/secret/IPN
      credentials outside Git.
- [ ] Confirm public staging callback/IPN domains.
- [ ] Record official SePay contract examples as sanitized test fixtures.

**Exit:** No unresolved decision can change the schema or public checkout copy.

### P1 — Persistence and pure domain logic

- [x] Add migration and JPA mappings.
- [x] Add server-owned plan catalog.
- [x] Add membership query, fulfillment, ledger, locking, and idempotency.
- [ ] Cover concurrent renewal, active renewal, expired renewal, duplicate
      order creation, and duplicate fulfillment. (Core locking/idempotency is
      implemented; the full integration matrix remains.)

**Exit:** Domain tests pass without network calls or SePay credentials.

### P2 — SePay adapter and API trust boundary

- [x] Add fixed-order checkout signer with a deterministic local fixture. The
      official provider known-value fixture remains pending Sandbox setup.
- [x] Add authenticated order/status/history APIs.
- [x] Add exact public IPN route and strict DTO validation.
- [x] Add mismatch/review handling and reconciliation client. (Manual admin
      lookup is read-only; it does not mutate Premium state.)
- [x] Add production fail-closed configuration checks.

**Exit:** All payment state transitions are server-controlled, transactionally
safe, and testable without a browser.

### P3 — Premium enforcement and Web journey

- [x] Add the approved entitlement gates with backward-compatible limits.
- [x] Add Premium page, account navigation, checkout form, and result states.
- [x] Update CSP and navigation.
- [ ] Add analytics without payment payload, email, amount, or provider secret.
- [ ] Add legal/payment copy placeholders marked as awaiting owner approval;
      do not enable Production sales while approval is absent.

**Exit:** A user can understand the product, pay in Sandbox, and observe access
activation without any false-success state.

### P4 — Operations and Sandbox acceptance

- [x] Add Gateway webhook limiter isolation and tests.
- [ ] Add metrics/alerts for IPN auth failures, mismatches, duplicate rate,
      processing failures, stuck pending orders, reconciliation failures, and
      payment-to-activation latency.
- [x] Add admin read-only reconciliation control.
- [ ] Run complete Sandbox scenario matrix.
- [ ] Run repository verification and isolated backup/restore rehearsal.

**Exit:** Sandbox evidence and operational ownership are attached to the
release record.

### P5 — Production rollout

- [ ] Obtain Production credentials and approved bank/payment method.
- [ ] Deploy with Billing code present but sales disabled.
- [ ] Verify Production IPN reachability, CSP report-only evidence, secrets,
      metrics, alert destination, and reconciliation.
- [ ] Enable VietQR sales for an internal account and one low-value controlled
      transaction.
- [ ] Verify settlement and entitlement, then enable public sales gradually.
- [ ] Keep NAPAS/cards and automatic recurring out of scope until separately
      approved.

**Exit:** Real-payment evidence, support owner, rollback owner, and legal/product
approval are recorded.

## 10. Verification Matrix

| Layer | Required checks |
|---|---|
| Signer | Official field order, omitted optional fields, UTF-8 description, exact Base64 HMAC |
| Order | Server price control, UUID idempotency, ownership, disabled sales, unique invoice |
| IPN auth | missing/wrong/correct secret, constant-time verifier unit check |
| IPN state | duplicate, unknown invoice, wrong amount, wrong currency, wrong method, non-approved state |
| Concurrency | two paid orders for one user extend rather than overwrite; duplicate event grants once |
| Membership | active, expired, renewed, deleted account, grandfathered free limits |
| Reconciliation | provider timeout, 401, 429/backoff, exact match, ambiguous result, already fulfilled |
| Gateway | dedicated IPN limiter group, POST never retried, request ID retained, no payload logging |
| Web | login requirement, exact form field order, CSP form target, pending/error/cancel/success states |
| Privacy | account export sanitized; logs/analytics contain no payment credentials or raw payload |
| Migration | fresh PostgreSQL migrate/validate and existing-schema upgrade |
| Sandbox | success IPN before redirect, redirect before IPN, duplicate IPN, delayed IPN, cancel, provider error |
| Full repository | Web typecheck/tests/build/budgets, Gateway tests, Core tests, Compose config, smoke, recovery rehearsal |

No test may make a real charge. Automated tests use deterministic fixtures;
only the explicit Sandbox acceptance run contacts SePay.

## 11. Rollout and Rollback

### Rollout order

```text
schema + disabled code
    -> Sandbox backend
        -> Sandbox Web
            -> operational alerts/admin visibility
                -> Production code with sales disabled
                    -> one controlled VietQR payment
                        -> gradual public enablement
```

### Kill switch

Turning `BILLING_SALES_ENABLED=false` must immediately block new order creation
while keeping these paths available:

- existing order status;
- IPN processing;
- reconciliation;
- membership reads;
- admin support visibility.

### Rollback rules

- Never remove the IPN endpoint while a created order may still complete.
- Never roll back by dropping Billing tables or deleting payment history.
- A Web rollback may hide purchase controls but must preserve status/history.
- Existing paid entitlements remain valid during a provider outage.
- If activation is unhealthy, disable new sales first, keep IPN receiving, and
  reconcile before any further rollout.

## 12. Explicit Non-Goals

- Payment microservice.
- Kafka/RabbitMQ/outbox between services.
- Automatic recurring renewal.
- Stored cards or bank credentials.
- Multiple Premium tiers, coupons, affiliate codes, credits, wallet, or gifts.
- NAPAS/card launch in the first release.
- Admin “mark paid” button.
- Client-authoritative price, duration, or payment result.
- Deleting historical payment records with account deletion.

## 13. Inputs Required From the Owner

These do not block writing disabled/Sandbox-safe code, but they block the named
release gate:

| Input | Blocks |
|---|---|
| Premium benefits and free limits | P3 entitlement enforcement |
| 30/90/180/365-day prices | P3 checkout copy and P5 sales |
| Refund/cancellation and retention policy | P5 production sales |
| Sandbox credentials and public staging URL | P4 Sandbox acceptance |
| Production credentials/bank account | P5 controlled payment |
| Legal/product/on-call owners | P5 public enablement |

## 14. Definition of Done

- [x] No new Payment microservice or unnecessary dependency was added.
- [x] Billing remains disabled without explicit runtime configuration.
- [x] Browser cannot choose price, duration, currency, or paid status.
- [x] Redirect cannot grant Premium.
- [x] Duplicate or concurrent provider events cannot double-grant access.
- [x] Authenticated mismatches are retained for review without granting access.
- [ ] Payment secrets and raw provider payloads do not enter logs, analytics,
      responses, Git, or browser storage.
- [x] Premium enforcement is server-side and not represented as a JWT role.
- [x] Existing free data remains intact under new limits.
- [ ] Account export/deletion and financial-retention behavior are documented
      and tested.
- [ ] CSP, Gateway rate limiting, configuration validation, monitoring,
      backup, reconciliation, rollout, and rollback are covered.
- [ ] All automated checks pass and the complete SePay Sandbox matrix has
      recorded evidence before Production is considered.
