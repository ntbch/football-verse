alter table user_predictions
    add column correct_outcome boolean,
    add column correct_exact_score boolean,
    add column correct_ou25 boolean,
    add column correct_btts boolean;

alter table fixtures
    add column version bigint not null default 0;