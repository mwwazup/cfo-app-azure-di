-- Add unique constraint to kpi_records to prevent duplicates
-- This ensures upsert operations work correctly

-- First, remove any existing duplicates
-- Keep only the most recent record for each (user_id, kpi_name, period) combination
DELETE FROM kpi_records a
USING kpi_records b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.kpi_name = b.kpi_name
  AND a.period = b.period;

-- Add unique constraint
ALTER TABLE kpi_records
ADD CONSTRAINT kpi_records_user_period_name_unique
UNIQUE (user_id, kpi_name, period);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_kpi_records_user_period_name
ON kpi_records(user_id, period, kpi_name);
