CREATE TABLE user_follow_targets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_key VARCHAR(120) NOT NULL,
    target_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_user_follow_targets_type CHECK (target_type IN ('CLUB', 'LEAGUE', 'PLAYER', 'TOPIC')),
    CONSTRAINT uk_user_follow_targets_user_target UNIQUE (user_id, target_type, target_key)
);

CREATE INDEX idx_user_follow_targets_user_created ON user_follow_targets(user_id, created_at DESC);
