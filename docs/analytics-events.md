# Product analytics events

Football Verse emits a provider-neutral `footballverse:analytics` browser event in development. A future analytics adapter may subscribe without changing product code.

| Event | Allowed identifiers |
| --- | --- |
| `onboarding_completed` | route, timestamp, authenticated |
| `story_evidence_viewed` | storyId, sourceCount, route, timestamp, authenticated |
| `prediction_submitted` | fixtureId, route, timestamp, authenticated |
| `daily_game_completed` | gameId, route, timestamp, authenticated |

No email, article body, prediction free text, comments, or other raw user-generated content is emitted.
