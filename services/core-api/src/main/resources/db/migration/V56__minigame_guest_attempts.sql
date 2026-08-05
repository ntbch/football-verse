alter table minigame_attempts alter column user_id drop not null;
alter table minigame_attempts add column guest_token_hash varchar(64);
create unique index uq_minigame_attempts_guest_attempt on minigame_attempts (guest_token_hash, challenge_id, attempt_key) where guest_token_hash is not null;
create index idx_minigame_attempts_guest_token on minigame_attempts (guest_token_hash);
