-- Phase 1 (expand): retain the legacy column until every old application instance is gone.
-- Existing sessions are revoked and their plaintext is replaced by a non-secret sentinel.
-- A later contract migration may drop token only after the rollout has completed.
alter table refresh_tokens add column token_hash varchar(64);

update refresh_tokens
set revoked_at = coalesce(revoked_at, current_timestamp),
    token_hash = lpad(id::text, 64, '0'),
    token = lpad(id::text, 64, '0');

alter table refresh_tokens add constraint refresh_tokens_token_hash_key unique (token_hash);
