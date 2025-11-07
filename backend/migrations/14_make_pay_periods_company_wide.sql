-- Migration: Make Pay Periods Company-Wide
-- Purpose: Convert pay periods from employee-specific to company-wide
-- Date: 2025-11-07
-- Backup Timestamp: 2025-11-07 11:09:00 UTC-07:00

-- ============================================================================
-- PART 1: Drop existing pay_periods table and recreate with new schema
-- ============================================================================
-- This is a clean migration since there are no daily records yet

-- Drop existing table (this will fail if there are foreign key constraints with data)
DROP TABLE IF EXISTS pay_periods CASCADE;

-- Create new pay_periods table with company-wide structure
CREATE TABLE pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (company owner/manager)
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT unique_period_per_user UNIQUE (user_id, period_name)
);

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index for querying by user
CREATE INDEX idx_pay_periods_user_id ON pay_periods(user_id);

-- Index for querying by date range
CREATE INDEX idx_pay_periods_dates ON pay_periods(user_id, start_date, end_date);

-- ============================================================================
-- PART 3: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pay periods
CREATE POLICY "Users can view own pay periods"
ON pay_periods
FOR SELECT
USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can insert their own pay periods
CREATE POLICY "Users can insert own pay periods"
ON pay_periods
FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can update their own pay periods
CREATE POLICY "Users can update own pay periods"
ON pay_periods
FOR UPDATE
USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can delete their own pay periods
CREATE POLICY "Users can delete own pay periods"
ON pay_periods
FOR DELETE
USING (auth.jwt() ->> 'sub' = user_id);

-- ============================================================================
-- PART 4: Update employee_daily_records foreign key
-- ============================================================================
-- The foreign key constraint should still work since pay_period_id references the UUID

-- Add comment to clarify new structure
COMMENT ON TABLE pay_periods IS 'Company-wide pay periods. Each period is shared across all employees in the company.';
COMMENT ON COLUMN pay_periods.user_id IS 'Clerk user ID of the company owner/manager. Pay periods are company-wide, not employee-specific.';
COMMENT ON COLUMN pay_periods.period_name IS 'Human-readable name for the pay period (e.g., "Jan 11-25 (Paid Feb 1)")';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'pay_periods' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'pay_periods';

-- Check RLS policies
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'pay_periods';
