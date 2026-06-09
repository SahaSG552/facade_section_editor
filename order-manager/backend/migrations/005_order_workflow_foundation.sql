-- Migration 005: workflow and order numbering foundation

CREATE TABLE IF NOT EXISTS order_user.order_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    stage VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_order_statuses_updated_at ON order_user.order_statuses;
CREATE TRIGGER update_order_statuses_updated_at BEFORE UPDATE ON order_user.order_statuses
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

INSERT INTO order_user.order_statuses (code, name, stage, sort_order, is_system)
VALUES
    ('client_draft', 'Client Draft', 'client', 10, true),
    ('sent_to_designer', 'Sent to Designer', 'designer', 20, true),
    ('designer_revision', 'Designer Revision', 'designer', 30, true),
    ('sent_to_technologist', 'Sent to Technologist', 'technologist', 40, true),
    ('technologist_revision', 'Technologist Revision', 'technologist', 50, true),
    ('approved', 'Approved', 'done', 60, true),
    ('cancelled', 'Cancelled', 'done', 90, true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE order_user.customers
    ADD COLUMN IF NOT EXISTS code VARCHAR(20);

UPDATE order_user.customers
SET code = CONCAT('C', UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6)))
WHERE code IS NULL OR btrim(code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code_unique ON order_user.customers (code);

CREATE TABLE IF NOT EXISTS order_user.order_counters (
    customer_code VARCHAR(20) PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_order_counters_updated_at ON order_user.order_counters;
CREATE TRIGGER update_order_counters_updated_at BEFORE UPDATE ON order_user.order_counters
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

ALTER TABLE order_user.orders
    ADD COLUMN IF NOT EXISTS order_kind VARCHAR(20) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES order_user.orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS split_part INTEGER,
    ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS base_number INTEGER,
    ADD COLUMN IF NOT EXISTS current_stage VARCHAR(80) NOT NULL DEFAULT 'client',
    ADD COLUMN IF NOT EXISTS status_code VARCHAR(80) NOT NULL DEFAULT 'client_draft';

UPDATE order_user.orders o
SET customer_code = c.code
FROM order_user.customers c
WHERE o.customer_id = c.id
  AND o.customer_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON order_user.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_code_base_number ON order_user.orders(customer_code, base_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_code ON order_user.orders(status_code);

CREATE TABLE IF NOT EXISTS order_user.order_stage_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES order_user.orders(id) ON DELETE CASCADE,
    from_status_code VARCHAR(80),
    to_status_code VARCHAR(80) NOT NULL,
    from_stage VARCHAR(80),
    to_stage VARCHAR(80) NOT NULL,
    actor_user_id UUID,
    actor_role_code VARCHAR(80),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_stage_transitions_order_id ON order_user.order_stage_transitions(order_id);

INSERT INTO order_user.roles (code, name, menus, panels, permissions, is_system)
VALUES
    (
      'designer',
      'Designer',
      '["dashboard","orders","materials"]'::jsonb,
      '["ordersTable","materialsTable"]'::jsonb,
      '["orders.read","orders.create","orders.update","orders.workflow.transition","materials.read","designs.read"]'::jsonb,
      true
    )
ON CONFLICT (code) DO NOTHING;

UPDATE order_user.roles
SET
    menus = '["dashboard","customers","orders","materials","users","roles","bans"]'::jsonb,
    panels = '["customersTable","ordersTable","materialsTable","usersTable","rolesEditor","banList"]'::jsonb
WHERE code = 'admin';
