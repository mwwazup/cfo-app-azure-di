-- Migration 55: Fix unique constraint to allow solo + helper records on same day
-- Problem: Migration 44 removed record_type from unique constraint, preventing
--          an employee from having both solo AND helper/crew records on the same date.
-- Solution: Add record_type back to the unique constraint
--
-- Use Case: John Doe works solo in the morning, then stops by to help Alpha Crew
--           in the afternoon. He needs TWO records for that day:
--           1. Solo record (record_type = 'solo')
--           2. Crew/helper record (record_type = 'crew')

-- Drop the old constraint from migration 44
ALTER TABLE employee_daily_records 
DROP CONSTRAINT IF EXISTS unique_employee_date_per_pay_period;

-- Also drop the constraint from migration 15 if it exists
ALTER TABLE employee_daily_records 
DROP CONSTRAINT IF EXISTS employee_daily_records_unique_record;

-- Add the new constraint that includes record_type
-- This allows an employee to have both solo AND crew records on the same date
ALTER TABLE employee_daily_records 
ADD CONSTRAINT unique_employee_date_record_type 
UNIQUE (pay_period_id, employee_id, date, record_type);

-- This allows:
-- ✅ Employee A can have a SOLO record on 2025-05-01
-- ✅ Employee A can have a CREW record on 2025-05-01 (same date, different record_type)
-- ✅ Employee B can have a SOLO record on 2025-05-01 (same date, different employee)
-- ❌ Employee A cannot have TWO SOLO records on 2025-05-01 (duplicate prevention)
