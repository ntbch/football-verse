# Phase 1 Tasks

1. Admin News CMS minimum complete
   - Admin can list non-deleted articles across draft, published, and archived states.
   - Admin can create, edit, publish, archive, and soft-delete articles.
   - Admin UI uses `/api/v1/admin/news/*`, not public news APIs.
2. RSS crawler minimum complete
   - Parse active RSS sources.
   - Deduplicate by source URL or content hash.
   - Save crawled items as published articles.
3. [x] News interaction integrity
   - Validate nested comment parents belong to the same article.
   - Keep like/bookmark/comment behavior stable after admin status changes.
4. [x] Forum moderation integrity
   - Validate reported thread/post targets exist.
   - Complete hide/restore moderation flows.
5. [x] Auth and profile hardening
   - Polish refresh/logout behavior.
   - Improve auth form and API error handling.
6. [x] Notifications polish
   - Ensure reply, lock, and report flows create useful notification links.
   - Verify mark-one and mark-all read behavior.
7. [x] Frontend UX hardening
   - Add loading, empty, and error states for Phase 1 routes.
   - Tighten route guards and form feedback.
8. [x] Phase 1 verification docs
   - Keep API docs and smoke-test notes current.
   - Re-run backend tests and frontend build before closing Phase 1.
