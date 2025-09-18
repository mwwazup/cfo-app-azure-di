-- Fix KPI Records Table - Add Missing Columns
-- Run this script to add the missing columns to the existing kpi_records table

-- Add missing columns to kpi_records table
ALTER TABLE kpi_records 
ADD COLUMN IF NOT EXISTS goal_value decimal(15,2),
ADD COLUMN IF NOT EXISTS trend_vs_last_month decimal(5,4),
ADD COLUMN IF NOT EXISTS kpi_category text DEFAULT 'revenue',
ADD COLUMN IF NOT EXISTS action_suggestion text,
ADD COLUMN IF NOT EXISTS display_format text DEFAULT 'number',
ADD COLUMN IF NOT EXISTS plain_explanation text;

-- Update existing records to have default kpi_category if null
UPDATE kpi_records 
SET kpi_category = 'revenue' 
WHERE kpi_category IS NULL;

-- Success message
SELECT 'KPI Records table updated with missing columns!' as status;
