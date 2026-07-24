-- Force update admin and moderator passwords with verified BCrypt hash
UPDATE users 
SET password_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
    updated_at = CURRENT_TIMESTAMP
WHERE email IN ('admin@footballverse.local', 'moderator@footballverse.local');
