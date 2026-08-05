-- Preserve the newest checkout and close older duplicate pending rows before
-- enforcing the invariant for concurrent order creation.
WITH ranked_pending AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS pending_rank
    FROM payment_orders
    WHERE status = 'PENDING'
)
UPDATE payment_orders
SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM ranked_pending WHERE pending_rank > 1);

CREATE UNIQUE INDEX uk_payment_orders_one_pending_user
    ON payment_orders(user_id)
    WHERE status = 'PENDING';
