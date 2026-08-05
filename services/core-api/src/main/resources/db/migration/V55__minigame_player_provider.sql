alter table minigame_players add column provider varchar(32) not null default 'API_FOOTBALL';
alter table minigame_players drop constraint if exists minigame_players_provider_player_id_key;
alter table minigame_players add constraint uq_minigame_players_provider_player unique (provider, provider_player_id);
create index idx_minigame_players_provider_refresh on minigame_players(provider, refreshed_at);
