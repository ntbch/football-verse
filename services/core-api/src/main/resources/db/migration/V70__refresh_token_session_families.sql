-- Refresh-token session families enable reuse detection: rotating from a
-- token inherits its family_id, and presenting an already-revoked token is
-- treated as a theft signal that revokes every active token in the family.
-- Legacy rows each become the root of their own family.
ALTER TABLE refresh_tokens ADD COLUMN family_id UUID;
UPDATE refresh_tokens SET family_id = gen_random_uuid();
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
