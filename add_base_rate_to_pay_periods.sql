-- Add base_rate to pay_periods table to preserve historical pay rates
-- This ensures that when an employee gets a raise, old pay periods still show correct calculations

-- Add base_rate column to pay_periods
ALTER TABLE pay_periods 
ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10,2);

-- Update existing pay periods to use current employee base rate
UPDATE pay_periods pp
SET base_rate = ei.current_base_rate
FROM employee_info ei
WHERE pp.employee_id = ei.id
  AND pp.base_rate IS NULL;

-- Make it NOT NULL after backfilling
ALTER TABLE pay_periods 
ALTER COLUMN base_rate SET NOT NULL;

-- Verify
SELECT 
    pp.period_name,
    ei.name AS employee_name,
    pp.base_rate AS period_base_rate,
    ei.current_base_rate AS current_base_rate
FROM pay_periods pp
JOIN employee_info ei ON pp.employee_id = ei.id
ORDER BY pp.start_date DESC;

SELECT 'base_rate column added to pay_periods - historical rates preserved!' AS status;
