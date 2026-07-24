# Sanitized Contract Fixtures

Date: 2026-07-22  
Purpose: representative pre-refactor shapes for characterization. Values are
generated examples; credentials are redacted and no production data is present.

## Register and Login Response

```json
POST /api/v1/auth/register
{
  "email": "generated-user@example.test",
  "username": "generated_user",
  "password": "<generated-test-password>"
}
```

```json
200
{
  "success": true,
  "data": {
    "accessToken": "<redacted-access-token>",
    "refreshToken": "<redacted-refresh-token>",
    "userId": 10001,
    "email": "generated-user@example.test",
    "username": "generated_user",
    "roles": ["USER"]
  }
}
```

The current response contains both bearer credentials. Fixtures and logs must
never contain their real values.

## Paged Public Read

```json
GET /api/v1/news?page=0&size=1
{
  "success": true,
  "data": {
    "content": [],
    "page": 0,
    "size": 1,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

The exact `PageResponse` field names are part of the observed web consumer
contract. Empty content is valid and must not be treated as an error.

## Forum Mutation

```json
POST /api/v1/forum/categories/league-tournament-news/threads
Authorization: Bearer <redacted>
{
  "title": "Generated fixture thread",
  "content": "Generated fixture content",
  "tags": []
}
```

The response is a Core `ApiResponse<ThreadResponse>`. A subsequent reply uses
the numeric thread ID while public navigation uses the generated slug.

## Career Identity Boundary

```text
Browser -> Gateway
Authorization: Bearer <redacted>

Gateway -> Career (primary path)
Authorization: Bearer <redacted>
X-Internal-Token: <redacted-service-credential>
```

```json
POST /game/saves
{ "name": "Generated Career" }
```

```json
200
{
  "id": "00000000-0000-4000-8000-000000000001",
  "name": "Generated Career"
}
```

Career responses are not wrapped in Core's `ApiResponse`. The UUID is an example
only and never authorizes access; Career derives the owning user from the
independently verified JWT while the internal token authenticates Gateway.

## Prediction Provider Fallback

```json
GET /matches/premier-league/fixtures
{
  "source": "mock",
  "league": "premier-league",
  "fixtures": []
}
```

Missing provider credentials or a mapped provider error currently degrades to a
mock/empty result for a supported league. An unsupported league maps to HTTP 404.

## Safe Error Surface

```json
401
{
  "success": false,
  "message": "Unauthorized"
}
```

Errors may expose a safe request ID in the future, but never tokens, internal
headers, stack traces, SQL, filesystem paths, upstream payloads, email addresses,
or user/database identifiers.
