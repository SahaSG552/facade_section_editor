-- Migration 009: Materials & Coatings Refactor
-- Add material categories, leaf dimensions, density, grain, and refactor coatings

-- Add new columns to materials table for categorization and leaf specs
ALTER TABLE order_user.materials
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'board',
ADD COLUMN IF NOT EXISTS leaf_height DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS leaf_width DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS has_grain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coating_1_id UUID REFERENCES order_user.coatings(id),
ADD COLUMN IF NOT EXISTS coating_2_id UUID REFERENCES order_user.coatings(id),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserve DECIMAL(10,2) DEFAULT 0;

UPDATE order_user.materials
SET category = 'board'
WHERE category = 'leaf';

-- Create index on category for fast filtering
CREATE INDEX IF NOT EXISTS idx_materials_category ON order_user.materials(category);

-- Add new columns to coatings table for customization
ALTER TABLE order_user.coatings
ADD COLUMN IF NOT EXISTS texture VARCHAR(100),
ADD COLUMN IF NOT EXISTS direction VARCHAR(50), -- 'none' | 'vertical' | 'horizontal'
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create index on coatings code for quick lookups
CREATE INDEX IF NOT EXISTS idx_coatings_code ON order_user.coatings(code);

-- Update sample materials with categories
UPDATE order_user.materials
SET category = 'board', leaf_height = 2800, leaf_width = 2070, density = 700
WHERE code = 'MDF-18';

UPDATE order_user.materials
SET category = 'board', leaf_height = 2500, leaf_width = 1250, density = 600
WHERE code = 'PLY-12';

-- Update sample coatings with new fields
UPDATE order_user.coatings
SET texture = 'matte', direction = 'none'
WHERE code = 'WH-MAT';

UPDATE order_user.coatings
SET texture = 'gloss', direction = 'none'
WHERE code = 'BK-GLO';

-- Add new coating examples for testing
INSERT INTO order_user.coatings (code, name, color, finish, texture, direction)
VALUES
    ('LAMI-OAK', 'Laminate Oak', '#8B4513', 'matte', 'wood', 'horizontal'),
    ('LAMI-BEECH', 'Laminate Beech', '#D4A574', 'matte', 'wood', 'vertical'),
    ('PAINT-WH', 'White Paint', '#FFFFFF', 'gloss', 'smooth', 'none')
ON CONFLICT (code) DO NOTHING;
