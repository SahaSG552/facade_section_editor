-- Migration 001: Initial schema for order-manager (PostgreSQL)
-- Usage:
--   psql -U order_user -d order_manager -f 001_initial_schema.sql

CREATE SCHEMA IF NOT EXISTS order_user AUTHORIZATION order_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS order_user.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials table
CREATE TABLE IF NOT EXISTS order_user.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thickness DECIMAL(10,2),
    density DECIMAL(10,2),
    cost_per_sqm DECIMAL(10,2),
    supplier VARCHAR(255),
    in_stock DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coatings table
CREATE TABLE IF NOT EXISTS order_user.coatings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50),
    finish VARCHAR(50),
    thickness DECIMAL(10,2),
    cost_per_sqm DECIMAL(10,2),
    in_stock DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Design catalog table
CREATE TABLE IF NOT EXISTS order_user.design_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url TEXT,
    design_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS order_user.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES order_user.customers(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON order_user.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON order_user.orders(status);

-- Order items table
CREATE TABLE IF NOT EXISTS order_user.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES order_user.orders(id) ON DELETE CASCADE,
    sequence_auto INTEGER NOT NULL,
    sequence_manual INTEGER,
    element_type VARCHAR(100) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    material_id UUID REFERENCES order_user.materials(id),
    coating_id UUID REFERENCES order_user.coatings(id),
    design_id UUID REFERENCES order_user.design_catalog(id),
    decor VARCHAR(255),
    preview_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_user.order_items(order_id);

-- Inventory transactions
CREATE TABLE IF NOT EXISTS order_user.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES order_user.materials(id),
    coating_id UUID REFERENCES order_user.coatings(id),
    quantity DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import jobs table
CREATE TABLE IF NOT EXISTS order_user.import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL,
    source_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS order_user.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION order_user.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers (idempotent)
DROP TRIGGER IF EXISTS update_customers_updated_at ON order_user.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON order_user.customers
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON order_user.materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON order_user.materials
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_coatings_updated_at ON order_user.coatings;
CREATE TRIGGER update_coatings_updated_at BEFORE UPDATE ON order_user.coatings
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_catalog_updated_at ON order_user.design_catalog;
CREATE TRIGGER update_design_catalog_updated_at BEFORE UPDATE ON order_user.design_catalog
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON order_user.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON order_user.orders
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_user.order_items;
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_user.order_items
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

-- Sample data
INSERT INTO order_user.customers (name, email)
VALUES ('Test Customer', 'test@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO order_user.materials (code, name, thickness, cost_per_sqm)
VALUES
    ('MDF-18', 'MDF 18mm', 18.0, 25.50),
    ('PLY-12', 'Plywood 12mm', 12.0, 32.00)
ON CONFLICT (code) DO NOTHING;

INSERT INTO order_user.coatings (code, name, color, finish)
VALUES
    ('WH-MAT', 'White Matte', '#FFFFFF', 'matte'),
    ('BK-GLO', 'Black Gloss', '#000000', 'gloss')
ON CONFLICT (code) DO NOTHING;
