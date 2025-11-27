-- Migration: Create big_fig_goals table for Lighthouse goals
-- Purpose: Store long-term "Lighthouse" revenue goals per user
-- NOTE: Non-destructive. Does not drop or alter any existing tables.

-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS big_fig_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Clerk user ID (e.g. "user_33fQP5vCktD5cLZwkg7fbysz2JS")
    target_annual_revenue NUMERIC(15,2) NOT NULL,
    target_owner_pay NUMERIC(15,2),
    target_profit_margin NUMERIC(5,2),
    years_to_goal INTEGER,
    target_year INTEGER NOT NULL,
    target_month INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index for user lookups
CREATE INDEX IF NOT EXISTS idx_big_fig_goals_user_id
    ON big_fig_goals(user_id);

-- Enable Row Level Security for multi-tenant safety
ALTER TABLE big_fig_goals ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage only their own Lighthouse goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'big_fig_goals' 
      AND policyname = 'Users can manage their own lighthouse goals'
  ) THEN
    CREATE POLICY "Users can manage their own lighthouse goals"
      ON big_fig_goals
      FOR ALL
      USING (user_id = auth.jwt()->>'sub')
      WITH CHECK (user_id = auth.jwt()->>'sub');
  END IF;
END $$;
