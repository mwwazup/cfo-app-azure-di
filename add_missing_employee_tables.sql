-- Add missing tables for Employee LER system
-- Only creates tables that don't exist yet

-- COGS Settings Table (per user)
-- Stores configurable cost of goods sold for each service type
CREATE TABLE IF NOT EXISTS cogs_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  cost_per_service DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

-- Company Settings Table (per user)
-- Stores company-wide settings for overhead, bonuses, and overtime
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  overhead_percent DECIMAL(5,2) DEFAULT 32,
  bonus_threshold_min DECIMAL(5,2) DEFAULT 25,
  bonus_threshold_max DECIMAL(5,2) DEFAULT 100,
  overtime_hours_daily DECIMAL(5,2) DEFAULT 12,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE cogs_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cogs_settings
CREATE POLICY "Users can view their own COGS settings"
  ON cogs_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own COGS settings"
  ON cogs_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own COGS settings"
  ON cogs_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own COGS settings"
  ON cogs_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for company_settings
CREATE POLICY "Users can view their own company settings"
  ON company_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings"
  ON company_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings"
  ON company_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company settings"
  ON company_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Insert default COGS settings for existing users (optional)
-- Uncomment and modify if you want to seed default values
/*
INSERT INTO cogs_settings (user_id, service_name, cost_per_service)
SELECT 
  id as user_id,
  service_name,
  cost_per_service
FROM auth.users
CROSS JOIN (
  VALUES 
    ('grill', 19.20),
    ('oven', 16.20),
    ('range', 15.00),
    ('ventHood', 20.00)
) AS defaults(service_name, cost_per_service)
ON CONFLICT (user_id, service_name) DO NOTHING;
*/

-- Insert default company settings for existing users (optional)
-- Uncomment if you want to seed default values
/*
INSERT INTO company_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cogs_settings_user_id ON cogs_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_cogs_settings_updated_at ON cogs_settings;
CREATE TRIGGER update_cogs_settings_updated_at
    BEFORE UPDATE ON cogs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
