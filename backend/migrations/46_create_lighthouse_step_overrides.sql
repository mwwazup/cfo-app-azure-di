-- Migration: Create lighthouse_step_overrides table
-- Purpose: Store per-year customizations for Lighthouse plan (revenue, theme, milestones)
-- This does NOT affect Master Revenue or FIR calculations - it's purely for Lighthouse page persistence

-- Create the table
CREATE TABLE IF NOT EXISTS lighthouse_step_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    year_index INTEGER NOT NULL,  -- 0-based index into the lighthouse steps array
    year_label TEXT NOT NULL,     -- e.g., "2025", "2026"
    target_revenue NUMERIC,       -- Custom target revenue for this year (null = use calculated)
    theme_index INTEGER,          -- Custom theme index within the phase (null = use default)
    milestones JSONB DEFAULT '[]'::jsonb,  -- Array of {id, text, completed}
    approved BOOLEAN DEFAULT FALSE,  -- Has user approved this step in review flow?
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on user_id + year_index
CREATE UNIQUE INDEX IF NOT EXISTS lighthouse_step_overrides_user_year_idx 
ON lighthouse_step_overrides(user_id, year_index);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS lighthouse_step_overrides_user_id_idx 
ON lighthouse_step_overrides(user_id);

-- Enable RLS
ALTER TABLE lighthouse_step_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own step overrides" ON lighthouse_step_overrides;
DROP POLICY IF EXISTS "Users can insert own step overrides" ON lighthouse_step_overrides;
DROP POLICY IF EXISTS "Users can update own step overrides" ON lighthouse_step_overrides;
DROP POLICY IF EXISTS "Users can delete own step overrides" ON lighthouse_step_overrides;

-- Create RLS policies for Clerk auth (user_id is TEXT, not UUID)
CREATE POLICY "Users can view own step overrides"
ON lighthouse_step_overrides FOR SELECT
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own step overrides"
ON lighthouse_step_overrides FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own step overrides"
ON lighthouse_step_overrides FOR UPDATE
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own step overrides"
ON lighthouse_step_overrides FOR DELETE
USING (user_id = current_setting('app.current_user_id', true));

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

-- Comment on table
COMMENT ON TABLE lighthouse_step_overrides IS 'Stores per-year customizations for Lighthouse plan. Does not affect Master Revenue.';
