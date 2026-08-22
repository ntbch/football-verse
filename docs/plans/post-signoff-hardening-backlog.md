# Post-signoff hardening backlog

Findings from the production-readiness audit that are deliberately
**scheduled** or **accepted with rationale** rather than fixed inside the
sign-off window. Each entry names its audit finding id.

## Scheduled

### Spring Boot 3.3.7 -> 3.5.x upgrade (audit finding #3, HIGH)

* Status: 3.3.x is past OSS support end; no more security patches.
* Why not now: a minor-line jump touches framework behavior across 120+
  tests, security filters, and Flyway; it must not land immediately before
  a production sign-off.
* Plan: dedicated branch, bump parent to latest 3.5.x patch, run the full
  gate matrix (`mvn test`, compose stack smoke), watch for:
  - Spring Security 6.4->6.5 lambda/customizer changes
  - Hibernate 6.6.x dialect/logging differences
  - Flyway module split changes
* Owner: engineering; target: first maintenance window after sign-off.

### CSP hardening (audit finding #27, LOW)

* Move theme init inline script to a nonce/hash-based `script-src` and pin
  `connect-src` websocket origins instead of `ws:`/`wss:` wildcards.
* Blocked on: choosing the runtime origin set (ngrok dev tunnels vs prod
  domain). Keep CSP Report-Only until reports are clean, then flip
  `CSP_ENFORCE=true`.

### SePay signed-field review (audit finding #30, TRIVIAL)

* `SePaySigner.SIGNED_FIELDS` lists `customer_id` which `orderedFields`
  never sets. Removing it changes signatures -> must be verified against
  the live SePay IPN spec before touching billing code.

## Accepted tradeoffs (documented, no action)

* **#24 per-request user load in JwtAuthenticationFilter**: acceptable at
  current traffic; revisit with a short-TTL cache only if auth p99 matters.
* **#25 access tokens lack jti/revocation**: logout leaves access tokens
  valid <=30 min by design (short TTL); refresh-token family revocation
  (V70) bounds the blast radius of stolen refresh sessions.
* **#26 requireBrowserOrigin no-op without Origin header**: defense-in-depth
  alongside SameSite cookies; non-browser clients are handled by the
  internal-token boundary.
* **#29 password policy min-length only**: NICE-TO-HAVE; complexity/
  breach checks deferred.
* **#32 browser E2E smoke opt-in**: intentional (`DAILY_LOOP_BROWSER_SMOKE=1`);
  not counted in unit coverage.
* **Cookie defaults diverge between application.yml (secure/None) and
  compose (false/Lax)**: intentional fail-safe defaulting - yml is secure
  by default and the production validator rejects non-Secure refresh
  cookies, while compose keeps local http development usable.
* **web package.json missing "type":"module"**: cosmetic Node ESM reparse
  warning under the test runner; adding it risks breaking CommonJS config
  loading in Next tooling for zero functional gain.