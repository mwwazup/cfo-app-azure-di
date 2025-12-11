-- Migration: Create crew_daily_attributions table
-- Purpose: Track individual crew member earnings from crew jobs
-- Each crew job creates one attribution record per crew member

-- Create crew_daily_attributions table
CREATE TABLE IF NOT EXISTS crew_daily_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,  -- Clerk user ID (company owner)
    daily_record_id UUID NOT NULL REFERENCES employee_daily_records(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee_info(id) ON DELETE CASCADE,
    role_id UUID REFERENCES crew_roles(id) ON DELETE SET NULL,
    
    -- Attribution details
    role_name TEXT NOT NULL,
    bonus_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_bonus_eligible BOOLEAN NOT NULL DEFAULT true,
    
    -- Attributed amounts (calculated from crew job totals)
    attributed_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    attributed_bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
    attributed_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one attribution per employee per daily record
    UNIQUE(daily_record_id, employee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crew_attributions_user_id ON crew_daily_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_attributions_daily_record ON crew_daily_attributions(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_crew_attributions_employee ON crew_daily_attributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_crew_attributions_crew ON crew_daily_attributions(crew_id);

-- Enable RLS
ALTER TABLE crew_daily_attributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Clerk auth
CREATE POLICY "crew_daily_attributions_select_policy" ON crew_daily_attributions
    FOR SELECT USING (true);

CREATE POLICY "crew_daily_attributions_insert_policy" ON crew_daily_attributions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "crew_daily_attributions_update_policy" ON crew_daily_attributions
    FOR UPDATE USING (true);

CREATE POLICY "crew_daily_attributions_delete_policy" ON crew_daily_attributions
    FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE crew_daily_attributions IS 'Tracks individual crew member earnings from crew jobs. Each crew job creates one attribution per member based on their role bonus percentage.';
