-- Migration 56: Add helper_appointments column to daily_record_crew_members
-- Purpose: Store which specific jobs/appointments a helper worked on
-- This allows the modal to pre-populate helper job assignments when editing

-- Add helper_appointments column (JSONB to store array of {appointmentIndex, hours})
ALTER TABLE daily_record_crew_members 
ADD COLUMN IF NOT EXISTS helper_appointments JSONB DEFAULT NULL;

-- Add is_helper column to explicitly mark helpers
ALTER TABLE daily_record_crew_members 
ADD COLUMN IF NOT EXISTS is_helper BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN daily_record_crew_members.helper_appointments IS 'JSON array of {appointmentIndex: number, hours: number} for helpers';
COMMENT ON COLUMN daily_record_crew_members.is_helper IS 'True if this crew member is a helper (not a regular crew member)';
