-- Fix ALL numeric field overflows in employee_daily_records table
-- Multiple fields are storing dollar amounts but defined as DECIMAL(5,2)
-- This causes overflow errors when values exceed $999.99

-- Fields that need fixing:
-- 1. bonus_qualified_for_percent - stores bonus dollar amount (not percentage)
-- 2. appointment_based_bonus - stores appointment bonus dollar amount
-- 3. daily_hourly_with_tips_and_bonus - stores hourly rate with bonuses
-- 4. daily_net_profit_after_bonus - stores net profit dollar amount

-- Change all from DECIMAL(5,2) to DECIMAL(15,2)
ALTER TABLE employee_daily_records 
  ALTER COLUMN bonus_qualified_for_percent TYPE DECIMAL(15,2);

ALTER TABLE employee_daily_records 
  ALTER COLUMN appointment_based_bonus TYPE DECIMAL(15,2);

ALTER TABLE employee_daily_records 
  ALTER COLUMN daily_hourly_with_tips_and_bonus TYPE DECIMAL(15,2);

ALTER TABLE employee_daily_records 
  ALTER COLUMN daily_net_profit_after_bonus TYPE DECIMAL(15,2);

-- Verify all changes
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND column_name IN (
    'bonus_qualified_for_percent',
    'appointment_based_bonus', 
    'daily_hourly_with_tips_and_bonus',
    'daily_net_profit_after_bonus'
  )
ORDER BY column_name;

SELECT 'All dollar amount fields updated to DECIMAL(15,2)' AS status;
