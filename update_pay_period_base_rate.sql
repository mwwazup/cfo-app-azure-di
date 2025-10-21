-- Quick fix: Update existing pay period's base rate to match current employee rate
-- This is a temporary solution until we do the full multi-employee redesign

-- OPTION 1: Update ALL pay periods for a specific employee to use a new rate
-- Replace 'YOUR_EMPLOYEE_ID' with the actual employee_id from employee_info table
-- Replace 29.81 with the desired base rate

UPDATE pay_periods 
SET base_rate = 29.81 
WHERE employee_id = 'YOUR_EMPLOYEE_ID';

-- OPTION 2: Update a SPECIFIC pay period
-- Replace 'YOUR_PAY_PERIOD_ID' with the actual period id
-- Replace 29.81 with the desired base rate

UPDATE pay_periods 
SET base_rate = 29.81 
WHERE id = 'YOUR_PAY_PERIOD_ID';

-- OPTION 3: Find your employee_id and pay period IDs first
-- Run this to see what you have:

SELECT 
    ei.id AS employee_id,
    ei.name AS employee_name,
    ei.current_base_rate AS current_rate,
    pp.id AS pay_period_id,
    pp.period_name,
    pp.base_rate AS period_rate,
    pp.start_date,
    pp.end_date
FROM employee_info ei
LEFT JOIN pay_periods pp ON pp.employee_id = ei.id
ORDER BY pp.start_date DESC;

-- Then use the IDs from above in OPTION 1 or OPTION 2

-- VERIFICATION: Check that it worked
SELECT 
    pp.period_name,
    pp.base_rate,
    COUNT(edr.id) AS num_daily_records
FROM pay_periods pp
LEFT JOIN employee_daily_records edr ON edr.pay_period_id = pp.id
GROUP BY pp.id, pp.period_name, pp.base_rate
ORDER BY pp.start_date DESC;
