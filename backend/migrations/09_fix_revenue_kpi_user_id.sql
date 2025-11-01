-- Fix revenue_entries and kpi_records tables for Clerk compatibility
-- These tables need user_id as TEXT (not UUID) to work with Clerk user IDs

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS revenue_entries CASCADE;
DROP TABLE IF EXISTS kpi_records CASCADE;

-- Create revenue_entries table with TEXT user_id for Clerk compatibility
CREATE TABLE IF NOT EXISTS revenue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- TEXT for Clerk user IDs (e.g., "user_33fQP5vCktD5cLZwkg7fbysz2JS")
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    actual_revenue DECIMAL(12,2) DEFAULT 0,
    desired_revenue DECIMAL(12,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    owner_draws DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create kpi_records table with TEXT user_id for Clerk compatibility
CREATE TABLE IF NOT EXISTS kpi_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- TEXT for Clerk user IDs (e.g., "user_33fQP5vCktD5cLZwkg7fbysz2JS")
    kpi_name TEXT NOT NULL,
    kpi_value DECIMAL(12,2),
    kpi_period TEXT NOT NULL,
    target_value DECIMAL(12,2),
    status TEXT DEFAULT 'good',
    goal_value DECIMAL(12,2),
    trend_vs_last_month TEXT,
    kpi_category TEXT,
    action_suggestion TEXT,
    display_format TEXT,
    plain_explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_entries_user_id ON revenue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_year_month ON revenue_entries(year, month);
CREATE INDEX IF NOT EXISTS idx_kpi_records_user_id ON kpi_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_period ON kpi_records(kpi_period);

-- Add RLS policies for revenue_entries
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenue entries"
    ON revenue_entries FOR SELECT
    USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can create their own revenue entries"
    ON revenue_entries FOR INSERT
    WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update their own revenue entries"
    ON revenue_entries FOR UPDATE
    USING (user_id = auth.jwt()->>'sub')
    WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete their own revenue entries"
    ON revenue_entries FOR DELETE
    USING (user_id = auth.jwt()->>'sub');

-- Add RLS policies for kpi_records
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own kpi records"
    ON kpi_records FOR SELECT
    USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can create their own kpi records"
    ON kpi_records FOR INSERT
    WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update their own kpi records"
    ON kpi_records FOR UPDATE
    USING (user_id = auth.jwt()->>'sub')
    WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete their own kpi records"
    ON kpi_records FOR DELETE
    USING (user_id = auth.jwt()->>'sub');

-- Create helper function to get Clerk user ID (if not already exists)
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.jwt()->>'sub';
$$;
