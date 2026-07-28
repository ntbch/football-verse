# Authentication and Email Verification Design

## Understanding summary

- Refresh Login and Register as a lightweight, form-first Football Verse journey across Light and Dark mode.
- Registering with email and password creates an account that cannot log in until its email is verified.
- Verification email is sent from `1footballverse@gmail.com`; users may register with any email provider, including Gmail.
- Google Sign-In remains direct because Google has already verified the email identity.
- Forgot-password becomes a real email-link flow that lets a user choose a new password and then sign in again.
- Provide dedicated clear UI states for sent, expired, used, invalid, unavailable, and retryable email situations.
- Exclude 2FA, email-address changes, account deletion, and a provider migration from this delivery.

## Assumptions and constraints

- Gmail SMTP uses a Google App Password and 2-Step Verification; credentials are environment variables only.
- Verification links expire after 24 hours; reset links expire after 30 minutes; each token is single use.
- Resend is available after 60 seconds and invalidates the previous token of the same purpose.
- Login uses one neutral invalid-credentials response for unknown, wrong-password, and unverified password accounts; resend is a separate email-entry action.
- Password-reset requests always return the same success response whether an email is registered or not.
- Password reset revokes active refresh sessions for the account; already-issued access tokens remain usable only until their existing short expiry.
- The public web URL is a canonical environment-configured HTTPS origin in production; it is the only origin accepted for email links, CORS, and safe post-login return paths.
- Unverified password accounts expire after seven days and are removed by a daily cleanup task, releasing a mistyped or abandoned email and username.

## Decisions

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Use one shared, calm auth layout | Tactical split-screen; bare system form | Keeps the form central and branded without visual distraction. |
| Block all password login until email verification | Limited access before verification | Satisfies the requested account-confirmation rule. |
| Retain direct Google Sign-In | Require an additional email link for Google | Google provides verified identity and the current direct flow is retained. |
| Use one-time hashed purpose-specific tokens | Store raw links/tokens; reuse JWTs | Limits database exposure and prevents a token from being used for the wrong flow. |
| Use Gmail SMTP from `1footballverse@gmail.com` | Add a transactional-email vendor now | Smallest setup that meets the requested flow; credentials remain external. |
| Confirm the new password only during reset | Omit confirmation everywhere | Registration stays short while the irreversible password-change step catches typos. |
| A verified Google identity activates a matching pending password account | Keep it pending; reject the Google sign-in | The Google email proof satisfies the same identity requirement, with issuer/audience/email-verified checks. |
| Keep unverified login responses generic | Return `EMAIL_UNVERIFIED` | Avoids making credential stuffing more informative; resend remains a separate email entry action. |
| Use fragment links and POST token exchange | Query-string token links | Prevents the token from being sent to the server, proxy logs, analytics, or referrers during page navigation. |
| Deliver mail after transaction commit through a persistent outbox | Call Gmail within the account/token transaction | Prevents a rollback from sending an invalid link and makes delivery failure observable/retryable. |

## UI and flow design

Login and Register share a compact, responsive shell: a small brand mark, a form-first card, semantic tokens, visible keyboard focus, inline errors, and no decorative tactical board. Login includes email, password reveal, a working Forgot password link, primary submit, and a distinct Google section. Register contains email, username, and password with concise live requirements and password reveal. Inputs use `autocomplete` values for email, username, current password, and new password; password reveal and Google controls have 44-pixel targets and accessible labels/states. Both disable duplicate submission and retain the safe `next` prediction return path when it is available in the same browser.

Successful email/password registration resolves to a pending-verification state, which says `If eligible, an email will arrive` rather than claiming delivery. It displays an accessible resend countdown, advises checking Spam/Junk, explains that only the newest link works, and provides `Use a different email` and sign-in actions. The email link uses a fragment token; the client reads it then POSTs it, immediately removes it from browser history, and resolves to loading, success, or expired/invalid states. Success has a clear sign-in action. Login keeps a generic invalid-credentials response; a separate `Resend verification` action accepts an email without revealing account state.

`/forgot-password` accepts an email and always responds with the same confirmation page. The email uses a fragment token; that page exchanges the fragment token by POST before history is cleaned. It provides a password field with reveal and validation, revokes all refresh sessions, and returns to Login. Existing access tokens remain valid only until their configured expiry. Validation, resend completion, send failure, and verify/reset loading-result states announce through `aria-live`; the first invalid field receives focus. Google popup cancellation, blocked popup, or provider error returns focus to its button and shows a concise retryable inline message. Every error/empty state is distinct: no account enumeration, no blank panels, and no fake links.

## Backend and email design

Canonicalize email by trim/lowercase before persistence and use database uniqueness for canonical email, username, and Google subject. A duplicate verified email receives the same generic registration acknowledgement; a duplicate pending email replaces only its pending verification token subject to resend limits. Token storage is keyed by user and purpose with expiry, SHA-256 hash, consumed time, and resend state. Tokens contain at least 32 secure-random bytes encoded as base64url; a partial unique index permits only one unconsumed token per `(user, purpose)`. Verification atomically marks the email verified and consumes the token. Reset atomically consumes the reset token, changes the password hash, and revokes refresh sessions. A new token first invalidates the old token within the same locked transaction. A daily cleanup removes unverified password accounts older than seven days and their active tokens.

Register returns a pending-verification response, never an access or refresh token; the controller therefore never writes a refresh cookie for that path. Google verification uses Google's signed-token verification endpoint plus issuer, expiry, configured audience, subject, and `email_verified: true`. It atomically links a canonical email to one Google subject; a matching pending password account is verified and linked before tokens are issued. Expose register, verify-email, resend-verification, forgot-password, reset-password, and current-user state through explicit DTOs. Rate-limit registration, resend, and reset in a database-backed window: five per email/action/hour and twenty per trusted client IP/action/hour. Email/IP values are HMAC-hashed with an environment secret; forwarded client addresses are trusted only from configured proxies. Windows are cleaned up after expiry.

Create the account/token and email-outbox item in one transaction, then deliver only after commit. The outbox retries bounded transient Gmail failures and records `SENT` or safe failure metadata without tokens, reset URLs, or full email addresses in logs. Gmail SMTP requires STARTTLS with certificate validation; `MAIL_FROM` must equal `SMTP_USERNAME` or a verified Gmail alias. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `MAIL_FROM`, `APP_PUBLIC_URL`, trusted proxies, and HMAC secret come only from the deployment secret store. Production fails fast when those mail/origin settings are missing or invalid; no link is constructed from request headers.

## Verification

The existing maximum access-token lifetime remains 30 minutes and production configuration rejects a larger value; refresh session revocation is verified at every refresh. Test registration-to-verification, abandoned-account cleanup, expired/used token, resend invalidation, generic unverified-login and reset responses, reset refresh-session revocation, Google issuer/audience/email-verified checks and pending-account activation, fragment-token history cleanup, canonical-email/subject conflict, durable rate-limit persistence, and mail delivery failure/outbox retry. Smoke-test all auth routes in Light/Dark, keyboard use, narrow screens, and the `next` return path.

## Structured design review

### Skeptic / Challenger

| Objection | Resolution |
| --- | --- |
| Pending accounts can reserve mistyped identifiers forever. | Accepted. Remove unverified password accounts after seven days and release their email/username. |
| Google may bypass or incorrectly link a pending account. | Accepted. Verify issuer, audience, subject, and `email_verified`; then verify and link the matching pending account before issuing tokens. |
| Register currently creates session tokens and refresh cookies. | Accepted. Register returns pending state only; no cookie or token is created until login after verification. |
| Reset cannot instantly invalidate access JWTs, and token consumption can race. | Accepted. State the actual boundary: revoke all refresh sessions and rely on short existing access-token expiry. Lock/token conditional updates enforce one-time use. |
| Query tokens leak through browser and infrastructure. | Accepted. Use URL fragments, client POST exchange, history cleanup, and an environment-pinned public origin. |
| Gmail and rate limits lack operational/durable behavior. | Accepted. Persist rate-limit windows, record non-sensitive send failures, permit resend, and treat Gmail delivery failure as an explicit retryable state. |
| `EMAIL_UNVERIFIED` exposes useful state to attackers. | Accepted. Use a generic login failure and a separate resend action instead. |

### Constraint Guardian

| Objection | Resolution |
| --- | --- |
| The document still contradicted itself about `EMAIL_UNVERIFIED`. | Accepted. Remove the API code; all password login failures are generic. |
| Concurrent resend can create multiple valid bearer tokens. | Accepted. Require 32 random bytes/base64url, SHA-256 storage, a partial unique active-token index, and locked invalidation plus issuance in one transaction. |
| Registration and Google linking need canonical identities and conflict rules. | Accepted. Canonicalize email, preserve unique email/username/Google-subject constraints, use generic duplicate-email registration response, and reject a conflicting Google subject. |
| Google claim checks alone do not verify an OIDC token. | Accepted. Use Google's token verification endpoint, then validate issuer, expiry, audience, subject, and `email_verified`. |
| Origin, SMTP, proxy, and rate-limit configuration were too loose. | Accepted. Fail fast on invalid production HTTPS origin/mail configuration; require STARTTLS/certificate validation, a verified sender, trusted-proxy IP handling, HMAC-protected identities, and explicit atomic quotas. |
| Reset/session and email-delivery lifecycle were not concrete enough. | Accepted. Keep access lifetime at a production-enforced maximum of 30 minutes, revoke refresh sessions on reset, and send from a post-commit persistent outbox with redacted logs and bounded retry. |

### User Advocate

| Objection | Resolution |
| --- | --- |
| Generic duplicate-email registration conflicts with a page that says an email was sent. | Accepted. Use conditional wording, `If eligible, an email will arrive`, and surface Sign in/Forgot password from the confirmation page. |
| “Change email” implies unsupported account editing, while resend and masking lack guidance. | Accepted. Rename it `Use a different email`, keep it as a return to registration, display a recognisable masked address, Spam/Junk guidance, 60-second accessible countdown, and newest-link rule. |
| Dynamic auth states and mobile controls need accessible behavior. | Accepted. Add `aria-live`, invalid-field focus, autocomplete values, 44-pixel controls, and accessible password-reveal state. |
| Google cancellation and cross-device verification make the return-path promise misleading. | Accepted. Return focus and show retryable Google errors; preserve `next` only when safely present in the same browser, never in an email-link promise. |

### Integrator / Arbiter

**Disposition: APPROVED.** The Understanding Lock is confirmed. All Skeptic / Challenger, Constraint Guardian, and User Advocate objections are accepted and resolved in the final design and decision log. No objection remains open or rejected.
