-- V15/V38/V39 created privileged accounts with credentials published in source control.
-- Preserve accounts whose password has already been changed, but disable every known default.
update refresh_tokens
set revoked_at = current_timestamp
where revoked_at is null
  and user_id in (
      select id from users
      where email in ('admin@footballverse.local', 'moderator@footballverse.local')
        and password_hash in (
            '$2a$10$wR1VpMsP2wI74L9XlC/GSuW9x2wY2EwB6h8o8N2VfS8B6j6v4I76S',
            '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
            '$2a$10$9T4S.FzAm4swQW1pDEQtXOgEdlz.6NYrMG9jyflK6RASHXrOZ7iDu'
        )
  );

update auth_action_tokens
set consumed_at = current_timestamp
where consumed_at is null
  and user_id in (
      select id from users
      where email in ('admin@footballverse.local', 'moderator@footballverse.local')
        and password_hash in (
            '$2a$10$wR1VpMsP2wI74L9XlC/GSuW9x2wY2EwB6h8o8N2VfS8B6j6v4I76S',
            '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
            '$2a$10$9T4S.FzAm4swQW1pDEQtXOgEdlz.6NYrMG9jyflK6RASHXrOZ7iDu'
        )
  );

update users
set status = 'BANNED',
    updated_at = current_timestamp
where email in ('admin@footballverse.local', 'moderator@footballverse.local')
  and password_hash in (
      '$2a$10$wR1VpMsP2wI74L9XlC/GSuW9x2wY2EwB6h8o8N2VfS8B6j6v4I76S',
      '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
      '$2a$10$9T4S.FzAm4swQW1pDEQtXOgEdlz.6NYrMG9jyflK6RASHXrOZ7iDu'
  );
