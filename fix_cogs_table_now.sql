-- Fix COGS table to match what the code expects
-- The code uses: user_id, service_name, cost_per_service

-- Drop and recreate with correct structure
DROP TABLE IF EXISTS cogs_settings CASCADE;

CREATE TABLE cogs_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  cost_per_service DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

-- Disable RLS (matches your architecture)
ALTER TABLE cogs_settings DISABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_cogs_settings_user_id ON cogs_settings(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_cogs_settings_updated_at
    BEFORE UPDATE ON cogs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cogs_settings'
ORDER BY ordinal_position;

SELECT 'COGS table fixed - now matches code expectations' AS status;
