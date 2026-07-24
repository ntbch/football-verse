-- Ensure admin and moderator accounts exist with valid BCrypt hash for password 'ChangeMe123!'
INSERT INTO users (created_at, updated_at, email, username, password_hash, status)
VALUES 
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin@footballverse.local', 'admin', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ACTIVE'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'moderator@footballverse.local', 'moderator', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ACTIVE')
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;

-- Ensure User Roles
INSERT INTO user_roles (user_id, role)
VALUES 
((SELECT id FROM users WHERE email = 'admin@footballverse.local'), 'ADMIN'),
((SELECT id FROM users WHERE email = 'moderator@footballverse.local'), 'MODERATOR')
ON CONFLICT DO NOTHING;

-- Explicitly update password hashes for existing admin and moderator accounts
UPDATE users 
SET password_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
    updated_at = CURRENT_TIMESTAMP
WHERE email IN ('admin@footballverse.local', 'moderator@footballverse.local');

