-- Migration: Add crew-specific bonus thresholds to company_settings
-- Date: 2025-12-09
-- Purpose: Crews have higher labor costs, so they need lower profit thresholds to qualify for bonuses

-- Add crew bonus threshold columns
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS crew_bonus_threshold_min DECIMAL DEFAULT 15,
ADD COLUMN IF NOT EXISTS crew_bonus_threshold_max DECIMAL DEFAULT 100;

-- Add comment explaining the purpose
COMMENT ON COLUMN company_settings.crew_bonus_threshold_min IS 'Minimum gross profit % for crew jobs to qualify for bonus (default 15%, lower than solo 25%)';
COMMENT ON COLUMN company_settings.crew_bonus_threshold_max IS 'Maximum gross profit % for crew jobs bonus calculation (default 100%)';

-- Also add cogs_percent to services table if missing (needed for LER calculations)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS cogs_percent DECIMAL DEFAULT 0;
