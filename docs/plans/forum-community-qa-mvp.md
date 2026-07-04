# Forum Community + Q&A MVP

## Understanding Summary

- Develop the forum toward a football discussion community plus lightweight Q&A.
- MVP includes hot/trending threads, solved/unsolved state, best answer, follow thread, reply count, and `latest/top/hot` sorting.
- Followed threads notify users on new replies and appear in the user's profile.
- Best answer and solved state can be set by the thread author, moderators, or admins.
- Target scale is dev/demo: dozens of users and hundreds of threads.
- Non-goals for this MVP: live match rooms, fan club spaces, reputation, badges, upvote/downvote answers, and rich editor work.

## Assumptions

- Reuse existing notification and SSE toast infrastructure.
- No forum-specific realtime channel is needed for MVP.
- Hot score can be computed from reply count, post like count, and latest activity at request time.
- Follow thread is only available to authenticated users.
- Backend authorization is authoritative; frontend role checks only hide controls.
- Thread replies remain chronological; best answer is highlighted in place.

## Decision Log

- Chose community discussion plus Q&A instead of live match rooms or fan club spaces because it fits the current forum model.
- Chose MVP scope B: hot/trending, solved/best answer, follow thread, reply count, and latest/top/hot sort.
- Chose dev/demo scale, avoiding cache, denormalized hot score, and heavy indexing.
- Chose thread author plus moderator/admin permission for solved/best answer.
- Chose follow thread as both notification subscription and profile list.
- Chose hot score as reply count plus like count plus latest activity.
- Chose minimal schema over denormalized counters until data size proves the need.

## Data Model

Add to `forum_threads`:

- `solved boolean not null default false`
- `best_answer_post_id bigint null references forum_posts(id)`
- `last_activity_at timestamp`

Add `forum_thread_follows`:

- `id bigint primary key`
- `thread_id bigint not null references forum_threads(id) on delete cascade`
- `user_id bigint not null references users(id) on delete cascade`
- unique `(thread_id, user_id)`

Do not add `reply_count`, `like_count`, or `hot_score` columns in MVP. Query counts from `forum_posts` and `forum_post_likes` for now.

## Backend API

- `POST /forum/threads/{id}/follow`
  - Toggles current user's follow.
  - Returns `{ followed: boolean }`.
- `GET /users/me/following-threads`
  - Returns followed thread list.
- `POST /forum/threads/{id}/best-answer`
  - Body: `{ postId }`.
  - Allowed for thread author, moderator, admin.
  - Validates post belongs to the same thread and is not hidden.
  - Sets `bestAnswerPostId` and `solved=true`.
- `DELETE /forum/threads/{id}/best-answer`
  - Allowed for thread author, moderator, admin.
  - Clears `bestAnswerPostId` and `solved=false`.
- Extend `GET /forum/categories/{slug}/threads` with `sort=latest|top|hot`.

Thread responses should include:

- `solved`
- `bestAnswerPostId`
- `followed`
- `replyCount`
- `lastActivityAt`

## Sorting

- `latest`: pinned first, then `lastActivityAt desc`.
- `top`: pinned first, then reply count plus like count desc.
- `hot`: pinned first, then reply count plus like count plus recency.

For MVP, exact scoring can stay simple and readable in repository queries.

## Notifications

On reply:

- Notify thread author.
- Notify followers.
- Exclude the replying user.
- Avoid duplicate notification if the author also follows the thread.
- Keep existing mention notifications.

## Frontend UX

Forum category page:

- Add `Latest | Top | Hot` sort control.
- Thread cards show reply count, solved/unsolved badge, pinned/locked state, and last activity time.

Thread detail:

- Show `Solved` badge in header.
- Add `Follow / Following` button.
- Show `Mark best answer` on posts for thread author, moderators, and admins.
- Show `Best answer` badge on the selected post.
- Show `Clear best answer` when a best answer exists.

Profile:

- Add `Following threads` section.
- Empty state: `No followed threads yet.`

## Edge Cases

- Reject best answer if the post belongs to another thread.
- Reject hidden posts as best answer.
- Clear best answer and solved state if the selected post is hidden later.
- Locked threads still allow follow/unfollow and reading, but not replies.
- Hidden threads and posts stay out of public reads.

## Tests

Backend integration tests:

- Follow/unfollow toggle.
- Follower gets notification on reply.
- Thread author can mark best answer.
- Non-author non-mod cannot mark best answer.
- Best answer post must belong to the same thread.
- `latest/top/hot` sort returns stable expected order.

Frontend checks:

- TypeScript passes.
- Category page passes sort param.
- Thread page renders follow and best answer controls.
