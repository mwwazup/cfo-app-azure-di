-- Migration: Make Pay Periods Company-Wide (FIXED for Clerk Auth)
-- Purpose: Convert pay periods from employee-specific to company-wide
-- Date: 2025-11-07
-- Backup Timestamp: 2025-11-07 11:09:00 UTC-07:00

-- ============================================================================
-- PART 1: Drop existing pay_periods table and recreate with new schema
-- ============================================================================

DROP TABLE IF EXISTS pay_periods CASCADE;

CREATE TABLE pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (company owner/manager)
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT unique_period_per_user UNIQUE (user_id, period_name)
);

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_pay_periods_user_id ON pay_periods(user_id);
CREATE INDEX idx_pay_periods_dates ON pay_periods(user_id, start_date, end_date);

-- ============================================================================
-- PART 3: Row Level Security (RLS) Policies - DISABLED FOR CLERK AUTH
-- ============================================================================

-- IMPORTANT: We're using Clerk for authentication, not Supabase Auth
-- Clerk user IDs are stored in user_id column as TEXT
-- Since we can't validate Clerk JWTs in Supabase RLS, we'll disable RLS
-- and rely on application-level security (Clerk authentication)

ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

-- Create permissive policy that allows all authenticated operations
-- Security is handled by Clerk at the application level
CREATE POLICY "Allow all operations for authenticated users"
ON pay_periods
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 4: Add comments
-- ============================================================================

COMMENT ON TABLE pay_periods IS 'Company-wide pay periods. Each period is shared across all employees in the company. Authentication handled by Clerk.';
COMMENT ON COLUMN pay_periods.user_id IS 'Clerk user ID of the company owner/manager. Pay periods are company-wide, not employee-specific.';
COMMENT ON COLUMN pay_periods.period_name IS 'Human-readable name for the pay period (e.g., "Jan 11-25 (Paid Feb 1)")';
