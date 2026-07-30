-- Migration V51: Expand football news sources to increase multi-source coverage of top football events

-- Seed new Publishers
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Premier League', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News La Liga', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Serie A', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Bundesliga', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News UEFA Champions League', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Real Madrid', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News FC Barcelona', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Manchester United', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Arsenal', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Liverpool', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Chelsea', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Manchester City', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Transfer Rumours', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '90min Football', 'www.90min.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'talkSPORT Football', 'talksport.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football365', 'www.football365.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'TeamTalk Football', 'www.teamtalk.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Marca English', 'www.marca.com', true, 0.8800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'AS English', 'en.as.com', true, 0.8800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football Espana', 'www.football-espana.net', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Get French Football News', 'www.getfootballnewsfrance.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Get German Football News', 'www.getfootballnewsgermany.com', true, 0.8500, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Premier League', 'https://news.google.com/rss/search?q=Premier+League+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Premier League')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News La Liga', 'https://news.google.com/rss/search?q=La+Liga+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News La Liga')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Serie A', 'https://news.google.com/rss/search?q=Serie+A+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Serie A')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Bundesliga', 'https://news.google.com/rss/search?q=Bundesliga+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Bundesliga')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News UEFA Champions League', 'https://news.google.com/rss/search?q=UEFA+Champions+League&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News UEFA Champions League')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Real Madrid', 'https://news.google.com/rss/search?q=Real+Madrid+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Real Madrid')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News FC Barcelona', 'https://news.google.com/rss/search?q=FC+Barcelona+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News FC Barcelona')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Manchester United', 'https://news.google.com/rss/search?q=Manchester+United+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Manchester United')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Arsenal', 'https://news.google.com/rss/search?q=Arsenal+FC+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Arsenal')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Liverpool', 'https://news.google.com/rss/search?q=Liverpool+FC+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Liverpool')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Chelsea', 'https://news.google.com/rss/search?q=Chelsea+FC+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Chelsea')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Manchester City', 'https://news.google.com/rss/search?q=Manchester+City+football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Manchester City')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Transfer Rumours', 'https://news.google.com/rss/search?q=football+transfer+rumours&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Transfer Rumours')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '90min Football', 'https://www.90min.com/posts.rss', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = '90min Football')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'talkSPORT Football', 'https://talksport.com/football/feed/', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'talkSPORT Football')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football365', 'https://www.football365.com/feed', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'Football365')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'TeamTalk Football', 'https://www.teamtalk.com/feed', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'TeamTalk Football')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Marca English', 'https://e00-marca.uecdn.es/rss/en/football.xml', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'Marca English')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'AS English', 'https://en.as.com/rss/football/portada.xml', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'AS English')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football Espana', 'https://www.football-espana.net/feed', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'Football Espana')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Get French Football News', 'https://www.getfootballnewsfrance.com/feed/', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'Get French Football News')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Get German Football News', 'https://www.getfootballnewsgermany.com/feed/', true, 'RSS', 'rss', true, (SELECT id FROM publishers WHERE name = 'Get German Football News'))
ON CONFLICT (feed_url) DO NOTHING;
