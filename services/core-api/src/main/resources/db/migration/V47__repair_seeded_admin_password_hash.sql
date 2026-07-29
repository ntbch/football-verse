-- V38/V39 seeded this known invalid hash. Repair only accounts that still have it,
-- preserving any administrator or moderator who has since chosen a different password.
update users
set password_hash = '$2a$10$9T4S.FzAm4swQW1pDEQtXOgEdlz.6NYrMG9jyflK6RASHXrOZ7iDu',
    updated_at = current_timestamp
where email in ('admin@footballverse.local', 'moderator@footballverse.local')
  and password_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a';
