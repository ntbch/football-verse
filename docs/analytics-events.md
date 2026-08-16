# Product analytics events

Football Verse emits a provider-neutral `footballverse:analytics` browser event in development. A future analytics adapter may subscribe without changing product code.

| Event | Allowed identifiers |
| --- | --- |
| `onboarding_completed` | route, timestamp, authenticated |
| `story_evidence_viewed` | storyId, sourceCount, route, timestamp, authenticated |
| `prediction_submitted` | fixtureId, route, timestamp, authenticated |
| `daily_game_completed` | gameId, route, timestamp, authenticated |
| `daily_hub_opened` | route, timestamp, authenticated |
| `story_opened` | storyId, sourceCount, route, timestamp, authenticated |
| `matchday_opened` | fixtureId, route, timestamp, authenticated |
| `context_opened` | contextId, route, timestamp, authenticated |
| `context_thread_started` | contextId, route, timestamp, authenticated |

Only the event-specific IDs listed above are accepted from callers. No email, article body, title, team name, prediction choice, comments, URL query string, token, provider payload, or other raw user-generated content is emitted.
