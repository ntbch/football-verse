# Identity Contract

Date: 2026-07-22  
Issuer: Core API  
Audience: `football-verse-api` by default

## Access Token

Core signs access tokens with HS256 and these required claims:

| Claim | Meaning |
|---|---|
| `iss` | configured Core issuer, default `football-verse-core` |
| `aud` | configured suite audience, default `football-verse-api` |
| `sub` | account email used by Core to reload the authoritative user |
| `uid` | positive numeric account ID used by Career owner scoping |
| `roles` | informational at the edge; Core reloads authoritative roles from DB |
| `exp` | access-token expiration |

Core, Gateway, and Career require HS256, the configured issuer/audience, a valid
signature, and a future expiry. Gateway also validates the claim types. Tokens
with the wrong signature, algorithm, issuer, audience, expiry, or required claim
shape are rejected without returning claim details.

## Career Request Path

```text
Browser
  Authorization: Bearer <access token>
      |
      v
Gateway
  validates JWT
  strips client-supplied identity/internal headers
  retains Authorization
  adds X-Internal-Token: <Gateway service credential>
      |
      v
Career
  validates service credential
  independently validates JWT
  derives gameUserId only from JWT uid
```

The service credential proves the caller is Gateway. It never selects a user.
The bearer token proves user identity. Career requires both on the primary path.

## Legacy Compatibility

The old private-network path uses `X-Internal-Token` plus `X-User-Id`. It is
disabled by default and can only be enabled explicitly with
`ALLOW_LEGACY_GAME_AUTH=true`. Even when enabled, Career accepts it only from a
loopback/site-local source, marks the response with
`X-Auth-Compatibility: legacy-header`, and emits a safe warning containing only
a validated request ID.

The global smoke asserts the compatibility header is absent, proving the current
topology uses the new path. Unit coverage preserves the old path only for a
bounded mixed-version rollout. Remove it after deployment logs show zero legacy
accepts for the agreed soak period.

## Production Configuration

| Variable | Production rule |
|---|---|
| `APP_ENV` | `production` |
| `JWT_SECRET` | at least 32 characters; known development value rejected |
| `INTERNAL_TOKEN` | at least 24 characters and distinct from JWT secret |
| `JWT_ISSUER` | non-empty and identical across Core/Gateway/Career |
| `JWT_AUDIENCE` | non-empty and identical across Core/Gateway/Career |
| `CORS_ORIGIN` | exact HTTPS origin at Gateway |
| `ALLOW_LEGACY_GAME_AUTH` | `false` unless an explicitly monitored compatibility window is active |

No secret or token may be placed in an image, source file, URL, log, error
response, metric label, or committed fixture.

## Internal Content API

Gateway returns a generic 404 for `/api/v1/internal/**`; the crawler reaches Core
only on the internal Compose network. Core compares the service credential in
constant time and returns generic errors. Internal import failures do not expose
exception messages, upstream payloads, SQL, filesystem paths, or source URLs.

