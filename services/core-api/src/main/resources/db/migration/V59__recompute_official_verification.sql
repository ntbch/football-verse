-- OFFICIAL is a denormalized projection. Recompute it from current publisher
-- truth so historical seed values cannot survive after provenance correction.
UPDATE news_articles article
SET verification_status = 'SINGLE_REPORT'
WHERE article.verification_status = 'OFFICIAL'
  AND NOT EXISTS (
      SELECT 1
      FROM story_items membership
      JOIN raw_items item ON item.id = membership.raw_item_id
      JOIN publishers publisher ON publisher.id = item.publisher_id
      WHERE membership.story_id = article.id
        AND publisher.official = TRUE
  );
