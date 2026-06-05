-- Migration 003: auth and role-based access control

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS order_user.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    menus JSONB NOT NULL DEFAULT '[]'::jsonb,
    panels JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_user.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(120) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(255),
    role_id UUID NOT NULL REFERENCES order_user.roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_roles_updated_at ON order_user.roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON order_user.roles
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON order_user.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON order_user.users
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

INSERT INTO order_user.roles (code, name, menus, panels, permissions, is_system)
VALUES
    (
      'admin',
      'Administrator',
      '["dashboard","customers","orders","materials","users","roles"]'::jsonb,
      '["customersTable","ordersTable","materialsTable","usersTable","rolesEditor"]'::jsonb,
      '["*"]'::jsonb,
      true
    ),
    (
      'technologist',
      'Technologist',
      '["dashboard","orders","materials"]'::jsonb,
      '["ordersTable","materialsTable"]'::jsonb,
      '["orders.read","orders.update","materials.read","materials.update"]'::jsonb,
      true
    ),
    (
      'client',
      'Client',
      '["dashboard","orders"]'::jsonb,
      '["ordersTable"]'::jsonb,
      '["orders.read"]'::jsonb,
      true
    )
ON CONFLICT (code) DO NOTHING;

INSERT INTO order_user.users (username, email, password_hash, display_name, role_id, is_active)
SELECT
  'admin',
  'admin@local.dev',
  crypt('admin123', gen_salt('bf')),
  'System Admin',
  r.id,
  true
FROM order_user.roles r
WHERE r.code = 'admin'
ON CONFLICT (username) DO NOTHING;
