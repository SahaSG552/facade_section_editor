-- Migration 002: role and default privileges hardening
-- This script is safe to run multiple times.

CREATE SCHEMA IF NOT EXISTS order_user AUTHORIZATION order_user;

GRANT USAGE, CREATE ON SCHEMA order_user TO order_user;
GRANT USAGE ON SCHEMA public TO order_user;

ALTER ROLE order_user IN DATABASE order_manager
  SET search_path = order_user, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA order_user TO order_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA order_user TO order_user;

ALTER DEFAULT PRIVILEGES FOR ROLE order_user IN SCHEMA order_user
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO order_user;

ALTER DEFAULT PRIVILEGES FOR ROLE order_user IN SCHEMA order_user
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO order_user;
