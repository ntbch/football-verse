ALTER TABLE payment_orders ADD COLUMN hidden_at TIMESTAMP(6) WITH TIME ZONE;
CREATE INDEX idx_payment_orders_user_visible ON payment_orders(user_id, hidden_at, created_at DESC);
