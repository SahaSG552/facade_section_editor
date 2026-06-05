-- Migration 004: user lifecycle, registration queue, and ban list

ALTER TABLE order_user.users
  ALTER COLUMN role_id DROP NOT NULL;

ALTER TABLE order_user.users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS order_user.banned_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind VARCHAR(30) NOT NULL CHECK (kind IN ('email', 'username')),
    value TEXT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES order_user.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_identities_kind_value
ON order_user.banned_identities (kind, lower(value));

CREATE INDEX IF NOT EXISTS idx_users_role_id ON order_user.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_blocked_deleted ON order_user.users(is_blocked, deleted_at);
