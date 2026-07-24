-- Migration V30: Update X (Twitter) feed URLs to valid RSS Search endpoints and verify Reddit feeds

UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Fabrizio+Romano+transfer&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 38;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=David+Ornstein+football&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 39;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Gianluca+Di+Marzio+transfer&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 40;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Ben+Jacobs+football&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 41;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Sami+Mokbel+football&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 42;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Laurie+Whitwell+manchester+united&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 43;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=James+Pearce+liverpool&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 44;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Sam+Lee+manchester+city&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 45;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Matteo+Moretto+transfer&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 46;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Florian+Plettenberg+transfer&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 47;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Gerard+Romero+barcelona&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 48;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Mario+Cortegana+real+madrid&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 49;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Christian+Falk+bayern&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 50;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Romeo+Agresti+juventus&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 51;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Daniele+Longo+milan&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 52;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=OptaJoe+stats&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 53;
UPDATE news_sources SET feed_url = 'https://news.google.com/rss/search?q=Statman+Dave+football&hl=en-US&gl=US&ceid=US:en', updated_at = CURRENT_TIMESTAMP WHERE id = 54;
