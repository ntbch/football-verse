CREATE TABLE payment_orders (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    client_request_id UUID NOT NULL,
    invoice_number VARCHAR(40) NOT NULL,
    provider VARCHAR(20) NOT NULL,
    plan_code VARCHAR(40) NOT NULL,
    amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency = 'VND'),
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(24) NOT NULL,
    provider_order_id VARCHAR(80),
    provider_transaction_id VARCHAR(100),
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP(6) WITH TIME ZONE,
    cancelled_at TIMESTAMP(6) WITH TIME ZONE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_payment_orders_user_request UNIQUE (user_id, client_request_id),
    CONSTRAINT uk_payment_orders_invoice UNIQUE (invoice_number),
    CONSTRAINT uk_payment_orders_provider_transaction UNIQUE (provider_transaction_id)
);

CREATE INDEX idx_payment_orders_user_created ON payment_orders(user_id, created_at DESC);
CREATE INDEX idx_payment_orders_status_expiry ON payment_orders(status, expires_at);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY,
    provider_event_id VARCHAR(100) NOT NULL UNIQUE,
    order_id UUID REFERENCES payment_orders(id),
    invoice_number VARCHAR(40),
    notification_type VARCHAR(40) NOT NULL,
    provider_order_status VARCHAR(40),
    provider_transaction_status VARCHAR(40),
    amount_vnd BIGINT,
    currency VARCHAR(3),
    status VARCHAR(24) NOT NULL,
    reason VARCHAR(300),
    received_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP(6) WITH TIME ZONE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_payment_events_invoice ON payment_events(invoice_number);
CREATE INDEX idx_payment_events_received ON payment_events(received_at DESC);

CREATE TABLE premium_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(16) NOT NULL,
    valid_from TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_premium_memberships_user UNIQUE (user_id)
);

CREATE INDEX idx_premium_memberships_expiry ON premium_memberships(status, valid_until);

CREATE TABLE premium_membership_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES payment_orders(id),
    entry_type VARCHAR(16) NOT NULL,
    duration_days INTEGER NOT NULL,
    previous_valid_until TIMESTAMP(6) WITH TIME ZONE,
    new_valid_until TIMESTAMP(6) WITH TIME ZONE,
    actor_id BIGINT,
    reason VARCHAR(300),
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_premium_ledger_order_grant UNIQUE (order_id, entry_type)
);

CREATE INDEX idx_premium_ledger_user_created ON premium_membership_ledger(user_id, created_at DESC);
