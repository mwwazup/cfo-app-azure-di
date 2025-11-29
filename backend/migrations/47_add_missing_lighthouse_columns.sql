-- Migration: Add missing columns to lighthouse_step_overrides
-- The original migration was missing year_label and milestones columns

-- Add year_label column (required for storing the year label like "2025", "2026")
ALTER TABLE lighthouse_step_overrides 
ADD COLUMN IF NOT EXISTS year_label TEXT;

-- Update existing rows to have a default year_label based on year_index
-- This assumes the current year is the starting point
UPDATE lighthouse_step_overrides 
SET year_label = (EXTRACT(YEAR FROM CURRENT_DATE) + year_index)::TEXT
WHERE year_label IS NULL;

-- Now make it NOT NULL after populating existing rows
ALTER TABLE lighthouse_step_overrides 
ALTER COLUMN year_label SET NOT NULL;

-- Add milestones JSONB column for storing milestone data
ALTER TABLE lighthouse_step_overrides 
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;

-- Add plan_status to big_fig_goals if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'big_fig_goals' AND column_name = 'plan_status'
    ) THEN
        ALTER TABLE big_fig_goals ADD COLUMN plan_status TEXT DEFAULT 'draft';
    END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lighthouse_step_overrides'
ORDER BY ordinal_position;
