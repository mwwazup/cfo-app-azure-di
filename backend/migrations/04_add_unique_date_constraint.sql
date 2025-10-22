-- Add unique constraint to prevent duplicate dates within the same pay period
-- This ensures data integrity at the database level

-- First, remove any existing duplicates (keep the most recently updated record)
DELETE FROM employee_daily_records a
USING employee_daily_records b
WHERE a.pay_period_id = b.pay_period_id
  AND a.date = b.date
  AND a.id < b.id;

-- Add unique constraint
ALTER TABLE employee_daily_records
ADD CONSTRAINT unique_date_per_pay_period 
UNIQUE (pay_period_id, date);

-- Verify the constraint was added
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'employee_daily_records'::regclass
  AND conname = 'unique_date_per_pay_period';

SELECT 'Unique date constraint added successfully!' AS status;
