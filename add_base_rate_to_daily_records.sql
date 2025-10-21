-- Add base_rate column to employee_daily_records table
-- This creates an audit trail of what hourly rate was used for each daily record

-- Add base_rate column
ALTER TABLE employee_daily_records 
ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10,2);

-- Update existing records to use their pay period's base rate
UPDATE employee_daily_records edr
SET base_rate = pp.base_rate
FROM pay_periods pp
WHERE edr.pay_period_id = pp.id
  AND edr.base_rate IS NULL;

-- Make it NOT NULL after backfilling
ALTER TABLE employee_daily_records 
ALTER COLUMN base_rate SET NOT NULL;

-- Verify
SELECT 
    edr.work_day,
    edr.date,
    edr.base_rate AS daily_record_base_rate,
    pp.base_rate AS pay_period_base_rate,
    edr.total_hours_worked,
    edr.employee_base_pay,
    (edr.total_hours_worked * edr.base_rate) AS calculated_base_pay
FROM employee_daily_records edr
JOIN pay_periods pp ON edr.pay_period_id = pp.id
ORDER BY edr.date DESC
LIMIT 10;

SELECT 'base_rate column added to employee_daily_records - audit trail created!' AS status;
