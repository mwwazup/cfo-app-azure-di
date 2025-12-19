-- Migration 15: Add record_type field and update unique constraint
-- Purpose: Support hybrid tracking (solo + crew records on same day)
-- Date: 2025-01-13

-- Add record_type column to employee_daily_records
ALTER TABLE employee_daily_records 
ADD COLUMN record_type TEXT DEFAULT 'solo' CHECK (record_type IN ('solo', 'crew'));

-- Add index for better query performance
CREATE INDEX idx_employee_daily_records_type ON employee_daily_records(record_type);

-- Drop the old unique constraint
ALTER TABLE employee_daily_records 
DROP CONSTRAINT IF EXISTS employee_daily_records_pay_period_id_date_key;

-- Add new unique constraint allowing both solo and crew records on same day
ALTER TABLE employee_daily_records 
ADD CONSTRAINT employee_daily_records_unique_record 
UNIQUE (pay_period_id, date, employee_id, record_type);

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS employee_record_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_record_id UUID NOT NULL REFERENCES employee_daily_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    old_values JSONB,
    new_values JSONB,
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    affected_crew_members JSONB -- Store list of all crew members affected by crew edits
);

-- Add index for audit log queries
CREATE INDEX idx_employee_record_history_record_id ON employee_record_history(daily_record_id);
CREATE INDEX idx_employee_record_history_employee_id ON employee_record_history(employee_id);
CREATE INDEX idx_employee_record_history_date ON employee_record_history(date);

-- Add comment
COMMENT ON COLUMN employee_daily_records.record_type IS 'Type of record: solo for individual work, crew for crew-based work';
COMMENT ON TABLE employee_record_history IS 'Audit trail for all changes to employee daily records';
