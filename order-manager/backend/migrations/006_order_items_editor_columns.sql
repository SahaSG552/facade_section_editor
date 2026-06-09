-- Migration 006: columns for order item editor

ALTER TABLE order_user.order_items
    ADD COLUMN IF NOT EXISTS manual_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS modification VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
