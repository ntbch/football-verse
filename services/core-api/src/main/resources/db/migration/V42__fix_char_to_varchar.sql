ALTER TABLE auth_action_tokens ALTER COLUMN token_hash TYPE varchar(64);
ALTER TABLE auth_rate_limit_windows ALTER COLUMN identity_hash TYPE varchar(64);
