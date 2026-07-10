alter table news_sources add column if not exists source_type varchar(12) not null default 'RSS';
alter table news_sources add column if not exists css_selector varchar(255);
alter table news_sources alter column feed_url drop not null;