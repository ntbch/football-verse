# Browser Authentication and Privacy Contract

Date: 2026-07-22  
Owners: Web, Gateway, Core API

## Session Model

- Core is the only issuer of access and refresh tokens.
- The Web keeps the access token only in its in-memory Zustand store. It must
  never write either bearer token to Web Storage, IndexedDB, URLs, analytics,
  logs, or rendered source.
- Core sets the refresh token in an HttpOnly cookie scoped to
  `/api/v1/auth`. `SameSite` is explicitly configured and production startup
  requires `Secure`.
- On a full reload, the Web posts an empty body to `/auth/refresh` with
  credentials enabled. Core rotates the refresh token and returns a new access
  token for memory only.

## Origin and Cache Boundaries

- The configured API origin is the only destination allowed to receive the
  in-memory access token.
- Gateway CORS permits the configured Web origin and credentials. It accepts
  only the headers used by the client, including `Cache-Control` for private
  requests.
- Auth endpoints and bearer-authenticated proxy responses carry
  `Cache-Control: private, no-store` and `Pragma: no-cache`. These headers are
  enforced on the upstream response at the proxy boundary so an upstream
  response cannot overwrite them.

## Logout and Browser History

- Logout revokes the refresh record when present, expires the refresh cookie,
  clears the memory store, and clears TanStack Query.
- A change of authenticated principal clears the entire query client before
  another account can reuse cached state.
- On a persisted `pageshow` event, the Web clears queries and rehydrates the
  session. Browser Back after logout must show only guest state.
- Career save, match, and session identifiers may remain in paths for routing;
  they are never authorization and the server must scope every lookup to the
  verified owner.

## Compatibility Window

Core temporarily accepts and returns the legacy refresh-token body for older
clients. The current Web sends no body token and discards `refreshToken` from
every auth response. Remove the body contract only after telemetry shows zero
old-client use for the agreed soak period.

## Verification

- `apps/web/tests/auth-privacy.test.ts` prevents bearer fields entering the
  browser auth model.
- Core cookie tests cover create, resolve, precedence, clear, SameSite, and
  production `Secure` enforcement.
- `scripts/smoke.py` checks cookie and no-store headers through Gateway.
- `scripts/browser-auth-smoke.js` uses generated `example.test` data to verify
  UI login, empty Web Storage, HttpOnly/path-scoped cookie, reload, logout, and
  Back navigation without printing identities or credentials.
