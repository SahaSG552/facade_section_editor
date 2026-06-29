-- Migration 007: onboarding profile and company review flow

CREATE TABLE IF NOT EXISTS order_user.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    contact_email VARCHAR(255),
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review'
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'blocked')),
    review_note TEXT,
    reviewed_by UUID REFERENCES order_user.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_companies_updated_at ON order_user.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON order_user.companies
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

CREATE TABLE IF NOT EXISTS order_user.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES order_user.users(id) ON DELETE CASCADE,
    first_name VARCHAR(120) NOT NULL DEFAULT '',
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    position_title VARCHAR(255),
    avatar_url TEXT,
    company_id UUID REFERENCES order_user.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON order_user.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON order_user.user_profiles
    FOR EACH ROW EXECUTE FUNCTION order_user.update_updated_at_column();

ALTER TABLE order_user.users
    ADD COLUMN IF NOT EXISTS user_status VARCHAR(32) NOT NULL DEFAULT 'registered'
      CHECK (user_status IN ('registered', 'profile_submitted', 'approved', 'rejected', 'blocked')),
    ADD COLUMN IF NOT EXISTS profile_submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES order_user.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_users_user_status ON order_user.users(user_status);
CREATE INDEX IF NOT EXISTS idx_companies_status ON order_user.companies(status);

-- Existing users with assigned role are treated as approved.
UPDATE order_user.users
SET user_status = 'approved'
WHERE role_id IS NOT NULL
  AND user_status = 'registered';
