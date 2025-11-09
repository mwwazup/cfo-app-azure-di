-- Migration: Add year column to pay_periods for filtering (FIXED)
-- Purpose: Allow users to filter pay periods by year
-- Date: 2025-11-07

-- Add year column without DEFAULT (we'll set it manually)
ALTER TABLE pay_periods 
ADD COLUMN year INTEGER;

-- Update existing records to set year based on start_date
UPDATE pay_periods 
SET year = EXTRACT(YEAR FROM start_date::date);

-- Now make it NOT NULL after data is populated
ALTER TABLE pay_periods 
ALTER COLUMN year SET NOT NULL;

-- Create index for filtering by year
CREATE INDEX idx_pay_periods_year ON pay_periods(user_id, year);

-- Update unique constraint to include year
ALTER TABLE pay_periods 
DROP CONSTRAINT IF EXISTS unique_period_per_user;

ALTER TABLE pay_periods 
ADD CONSTRAINT unique_period_per_user_year UNIQUE (user_id, period_name, year);

-- Add comment
COMMENT ON COLUMN pay_periods.year IS 'Calendar year for the pay period. Used for filtering and distinguishing recurring periods (e.g., "12/26-1/10" for 2024 vs 2025).';
