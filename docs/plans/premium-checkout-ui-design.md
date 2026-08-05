# Premium Checkout UI and QR Design

**Status:** Approved for implementation  
**Date:** 2026-08-05  
**Scope:** Premium pricing, bank-transfer checkout, QR presentation, and payment history

## Understanding summary

- Football Verse needs a focused Premium purchase journey instead of a crowded marketing page.
- The page must introduce the available plans, then move into a dedicated payment state after a plan is selected.
- Four fixed-access plans are sold: 1, 3, 6, and 12 months, represented by 30, 90, 180, and 365 days.
- Prices are VND 49,000, 129,000, 219,000, and 349,000, respectively, and are owned by the backend catalog.
- The primary payment action is scanning a large bank-transfer QR; account, amount, and reference are also readable outside the image.
- VietQR/NAPAS/bank logos may remain in the QR, but SePay branding must not appear in the bitmap.
- A user may have only one pending order; it must be paid or cancelled before another order can be created.

## Assumptions

- Access periods are fixed day counts, not calendar-month arithmetic: 1 month = 30 days, 3 = 90, 6 = 180, and 12 = 365 days.
- The UI language remains English throughout the Premium flow.
- SePay remains a server-side webhook/payment-confirmation provider; browser redirects never grant access.
- QR generation uses an HTTPS, allowlisted, provider-neutral VietQR source or controlled renderer. The existing branded image is not cropped or overlaid.
- Terminal history entries may be hidden from the user, but financial/audit records are never deleted.
- Polling is sufficient for the first release; realtime push is out of scope.

## Decision log

| Decision | Alternatives considered | Resolution |
|---|---|---|
| Pricing → checkout state (B) | Single long page; split checkout column | Reduces cognitive load and makes the QR the payment focus. |
| Four fixed plans | Keep only 30/365; calendar-month durations | Owner requested 1/3/6/12; fixed days make fulfillment deterministic. |
| Server-owned catalog | Client-supplied amount/duration; duplicated Web config | Prevents price tampering and UI/backend drift. |
| One pending order per user | Allow multiple pending orders; UI-only guard | Database invariant plus locked service path prevents concurrent duplicates. |
| Neutral QR with bank/VietQR branding | Keep SePay image; crop/cover logo; black/white custom QR | Preserves scan reliability while removing provider branding. |
| No “I paid” button | Manual confirmation button; redirect-only success | IPN/reconciliation is the only trusted confirmation path. |
| Hide only terminal history | Delete any order; hide pending order | Preserves payment auditability and prevents hiding an actionable order. |

## Final design

### Pricing state

The page opens with a compact Premium introduction and four equal plan cards. Each card shows:

- plan label (`1 month · 30 days`, etc.);
- total price and monthly-equivalent context;
- one concise benefit line;
- one primary `Choose plan` action.

The 12-month plan is marked `Best value`. Long benefit lists, duplicated payment instructions, and provider copy are omitted. A compact payment-history section remains below the plans.

### Checkout state

Selecting a plan replaces the pricing grid with a focused checkout panel:

1. order status and countdown (`Awaiting transfer`, `mm:ss`);
2. large responsive QR (minimum 320px desktop, 280px mobile);
3. short instruction: `Scan this QR with your banking app`;
4. transfer details outside the QR: bank, account number, account holder, amount, and reference;
5. copy controls for account number and reference, with a brief success toast;
6. `Cancel order` action with a short confirmation.

There is no manual paid-confirmation button. The page polls order status and changes to `Paid` only after verified server confirmation. An expired order disables the QR and shows `Choose another plan`. A pending order in the URL or on refresh opens checkout directly and blocks new-order creation until it is paid or cancelled.

### QR contract

The server constructs the payload from the persisted order: destination bank/account, exact VND amount, and short invoice/reference. The QR image source is HTTPS and allowlisted, must not include SePay text/logo, and must not be modified with CSS cropping or overlays. VietQR/NAPAS/bank logos are allowed only when the generated image retains a valid quiet zone and error-correction level. The payload and the values displayed outside the image must match exactly.

### State and integrity rules

- A PostgreSQL partial unique index enforces one `PENDING` order per user; a conflict returns `409` with an actionable message.
- Create, cancel, expiry normalization, and webhook fulfillment use the same order lock.
- `CANCELLED` and `EXPIRED` are terminal for automatic fulfillment. A late transfer is recorded for review and never auto-grants Premium.
- Every path normalizes `PENDING` orders whose `expires_at` has passed before deciding what to do.
- Webhook events are deduplicated idempotently; only verified provider events with matching invoice, amount, currency, and state can grant access.
- Plan code is the only plan input accepted from Web; price, duration, currency, and payment state stay server-controlled.

### History

History is compact and useful: date, plan, amount, status, and expiry. Pending rows show their countdown and cannot be hidden. `PAID`, `CANCELLED`, and `EXPIRED` rows may be hidden from the list; hiding is not deletion.

## Verification gates

- Backend tests: unique-pending race, cancel/webhook race, expiry boundary, duplicate webhook, late transfer, server catalog, and ownership.
- QR acceptance: decode the exact rendered image at 280–320px on mobile and verify long-reference behavior for supported banks.
- Web checks: responsive layout, copy controls, polling states, deep-link refresh, expired-order disablement, one-pending messaging, and English-only copy.
- Smoke check: pricing → checkout → cancel/new order and pricing → checkout → verified paid state.

## Explicit non-goals

- Automatic recurring renewal, cards, NAPAS checkout, coupons, wallets, or multiple payment providers.
- A Payment microservice for this first paid product.
- Client-side or redirect-based Premium activation.
- Cropping, masking, or visually covering SePay branding in an otherwise unchanged QR image.

