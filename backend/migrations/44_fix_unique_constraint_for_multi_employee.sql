-- Migration 44: Fix unique constraint to support multiple employees on same date
-- Problem: Current constraint UNIQUE(pay_period_id, date) prevents multiple employees
--          from having records on the same date in the same pay period
-- Solution: Change to UNIQUE(pay_period_id, employee_id, date) to allow multiple employees
--          while still preventing duplicate records for the same employee on the same date

-- Drop the old constraint
ALTER TABLE employee_daily_records 
DROP CONSTRAINT IF EXISTS unique_date_per_pay_period;

-- Add the new constraint that includes employee_id
ALTER TABLE employee_daily_records 
ADD CONSTRAINT unique_employee_date_per_pay_period 
UNIQUE (pay_period_id, employee_id, date);

-- This allows:
-- ✅ Employee A can have a record on 2025-05-01
-- ✅ Employee B can have a record on 2025-05-01 (same date, different employee)
-- ❌ Employee A cannot have TWO records on 2025-05-01 (duplicate prevention)
