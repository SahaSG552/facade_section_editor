ALTER TABLE order_user.orders
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE TABLE IF NOT EXISTS order_user.order_status_responsibles (
    status_id UUID NOT NULL REFERENCES order_user.order_statuses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES order_user.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (status_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_order_status_responsibles_user_id
    ON order_user.order_status_responsibles(user_id);
