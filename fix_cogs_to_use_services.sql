-- Fix COGS settings to use dynamic services from services table
-- Instead of hardcoded service names, link to user's actual services

-- ============================================
-- STEP 1: Create new COGS table structure
-- ============================================

-- Drop old cogs_settings table (if you haven't entered data yet)
DROP TABLE IF EXISTS cogs_settings CASCADE;

-- Create new cogs_settings table that references services table
CREATE TABLE cogs_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  cost_per_service DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Each service can only have one COGS value per user
  UNIQUE(user_id, service_id)
);

-- Create index for performance
CREATE INDEX idx_cogs_settings_user_id ON cogs_settings(user_id);
CREATE INDEX idx_cogs_settings_service_id ON cogs_settings(service_id);

-- Add updated_at trigger
CREATE TRIGGER update_cogs_settings_updated_at
    BEFORE UPDATE ON cogs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Disable RLS (matches your architecture)
-- ============================================

ALTER TABLE cogs_settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Verify
-- ============================================

-- Check the new structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cogs_settings'
ORDER BY ordinal_position;

SELECT 'COGS settings now linked to services table - users can set COGS for their own services' AS status;
